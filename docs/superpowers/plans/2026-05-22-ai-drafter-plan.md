# AI Drafter — Internal Research Leads (Spec 2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a 6-hour cron that runs an LLM drafter pipeline. Each invocation pulls Exa news context, calls OpenAI to write a McKinsey-format article, validates the output (strict URL whitelist against the Exa results), and posts to Strapi as a draft. Drafts are research leads for staff editors — never published as-is.

**Architecture:** Three pieces. A GitHub Actions workflow that curls an authed endpoint every 6 hours. A Next.js route at `/api/internal/draft-writer` that checks a shared-secret bearer + a kill-switch env var, then runs the pipeline and returns a status JSON. A self-contained pipeline module at `src/lib/draft-writer.ts` that reuses the existing Exa integration and OpenAI client.

**Tech Stack:** GitHub Actions, Next.js (App Router) Node.js runtime, OpenAI Chat Completions API, Exa search API, Strapi REST. No new external dependencies.

**Testing posture:** Build → manually verify → commit. Same as Spec 1 plans.

**Depends on:** Spec 1 Phase B shipped (article schema has `executiveSummary`, `sourceNotes`, `format`, `deepDive` fields the drafter populates).

---

## File structure

**New files:**

- `.github/workflows/draft-writer.yml`
- `src/app/api/internal/draft-writer/route.ts`
- `src/lib/draft-writer.ts`

**Modified files:**

- `docs/google-cloud.md` — document the two new env vars (`DRAFT_WRITER_SECRET`, `DRAFT_WRITER_ENABLED`) and the one-time `ai-drafter` Strapi author seed.

---

## Task 1: Create the drafter pipeline (`src/lib/draft-writer.ts`)

**Files:**
- Create: `src/lib/draft-writer.ts`

- [ ] **Step 1: Write the module**

```ts
import "server-only";

import { topicCards as fallbackTopics } from "@/content/site";
import type { Topic } from "@/content/site";
import { searchPersonalizedNewsWithExa } from "@/lib/exa-news";
import { getTopics } from "@/lib/cms";

type DrafterStatus =
  | "posted"
  | "validation_failed"
  | "exa_empty"
  | "llm_failed"
  | "strapi_failed";

export type DrafterResult = {
  status: DrafterStatus;
  topicSlug: string;
  articleId: number | null;
  errorReason?: string;
};

type DraftJson = {
  title: string;
  summary: string;
  body: string;
  executiveSummary: string[];
  sourceNotes: { text: string; url: string }[];
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? process.env.STRAPI_URL;
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const PROMPT_CACHE_KEY = "common-ground-drafter:v1";

const DRAFTER_SYSTEM_PROMPT = `
Common Ground is an advertisement-free public-interest news portal. Its
editorial rules are:

1. Headlines inform before they persuade. Never use fear-based framing,
   false urgency, or rhetorical devices designed to trigger clicks.
2. Every claim should be traceable to its origin. Prefer primary records,
   named interviews, and public documents over summaries.
3. Story placement reflects civic value, not engagement metrics.
4. Corrections are transparent and same-day. Acknowledge uncertainty
   explicitly — do not paper over gaps with confident language.

You are drafting a research lead for a staff editor. Your output is NOT
published as-is. The editor will verify every source and rewrite the
prose. Your job is to produce a structured starting point.

Produce a JSON object with EXACTLY this shape (no extra fields, no
markdown wrapper):

{
  "title": string (10-180 chars),
  "summary": string (1-3 sentences),
  "body": string (400-700 words of plain prose; HTML allowed only for <p> tags),
  "executiveSummary": string[] (3-5 short findings),
  "sourceNotes": { "text": string, "url": string }[]
}

CRITICAL RULES:

- Every URL in sourceNotes MUST be a URL present in the supplied Exa
  results. Do not invent URLs. Do not modify URL paths.
- Never claim a specific number, statistic, or named source that is not
  in the supplied Exa results.
- Use calm, factual, proportionate language. No drama adjectives.
- Treat readers as capable adults. Do not moralize, scold, or flatter.
- Short sentences. Active voice.
`.trim();

function normaliseBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function pickRandomTopic(topics: Topic[]): Topic | null {
  const eligible = topics.filter((topic) => topic.slug !== "music-arts");
  if (eligible.length === 0) return null;
  const index = Math.floor(Math.random() * eligible.length);
  return eligible[index];
}

function isDraftJsonShape(value: unknown): value is DraftJson {
  if (!value || typeof value !== "object") return false;
  const cast = value as Record<string, unknown>;
  if (typeof cast.title !== "string" || cast.title.length < 10 || cast.title.length > 200) {
    return false;
  }
  if (typeof cast.summary !== "string") return false;
  if (typeof cast.body !== "string" || cast.body.length < 300) return false;
  if (!Array.isArray(cast.executiveSummary)) return false;
  if (cast.executiveSummary.length < 3 || cast.executiveSummary.length > 5) {
    return false;
  }
  if (!cast.executiveSummary.every((bullet) => typeof bullet === "string")) {
    return false;
  }
  if (!Array.isArray(cast.sourceNotes) || cast.sourceNotes.length === 0) {
    return false;
  }
  if (
    !cast.sourceNotes.every((note) => {
      if (!note || typeof note !== "object") return false;
      const nCast = note as Record<string, unknown>;
      return typeof nCast.text === "string" && typeof nCast.url === "string";
    })
  ) {
    return false;
  }
  return true;
}

async function findStrapiTopicId(slug: string): Promise<number | null> {
  if (!STRAPI_URL || !STRAPI_API_TOKEN) return null;

  const url = `${normaliseBaseUrl(STRAPI_URL)}/api/topics?filters[slug][$eq]=${encodeURIComponent(slug)}&pagination[limit]=1`;
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { data?: Array<{ id?: number }> };
    return data.data?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

async function findStrapiAuthorIdBySlug(slug: string): Promise<number | null> {
  if (!STRAPI_URL || !STRAPI_API_TOKEN) return null;

  const url = `${normaliseBaseUrl(STRAPI_URL)}/api/authors?filters[slug][$eq]=${encodeURIComponent(slug)}&pagination[limit]=1`;
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { data?: Array<{ id?: number }> };
    return data.data?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

export async function runDrafterPipeline(): Promise<DrafterResult> {
  if (!OPENAI_API_KEY || !STRAPI_URL || !STRAPI_API_TOKEN) {
    return {
      status: "strapi_failed",
      topicSlug: "",
      articleId: null,
      errorReason: "missing env: OPENAI_API_KEY, STRAPI_URL, or STRAPI_API_TOKEN",
    };
  }

  // 1. Topic selection (random, excluding music-arts)
  const topics = await getTopics().catch(() => fallbackTopics);
  const topic = pickRandomTopic(topics);
  if (!topic) {
    return { status: "exa_empty", topicSlug: "", articleId: null, errorReason: "no eligible topics" };
  }

  // 2. Exa retrieval
  const exaResults = await searchPersonalizedNewsWithExa(
    topic.name,
    {
      name: "AI drafter",
      topicSlugs: [topic.slug],
      storyTypes: ["reporting", "analysis", "opinion"],
      maxReadMinutes: null,
      includeKeywords: [],
      excludeKeywords: [],
      minSourceCount: 1,
      onlyFeatured: false,
      deliveryStyle: "mixed",
    },
    topics,
  );

  if (exaResults.length === 0) {
    return { status: "exa_empty", topicSlug: topic.slug, articleId: null };
  }

  const allowedUrls = new Set(exaResults.map((result) => result.url));

  // 3. LLM call
  const llmUserMessage = JSON.stringify({
    topic: { slug: topic.slug, name: topic.name, focus: topic.editorialFocus },
    exaResults: exaResults.slice(0, 10).map((result) => ({
      title: result.title,
      url: result.url,
      summary: result.summary,
      publisher: result.publisher,
      publishedOn: result.publishedOn,
    })),
  });

  let llmResponse: { choices?: Array<{ message?: { content?: string } }> };
  try {
    const response = await fetch(`${normaliseBaseUrl(OPENAI_BASE_URL)}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.3,
        max_tokens: 3000,
        prompt_cache_key: PROMPT_CACHE_KEY,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: DRAFTER_SYSTEM_PROMPT },
          { role: "user", content: llmUserMessage },
        ],
      }),
    });

    if (!response.ok) {
      return {
        status: "llm_failed",
        topicSlug: topic.slug,
        articleId: null,
        errorReason: `OpenAI HTTP ${response.status}`,
      };
    }

    llmResponse = await response.json();
  } catch (error) {
    return {
      status: "llm_failed",
      topicSlug: topic.slug,
      articleId: null,
      errorReason: error instanceof Error ? error.message : "network",
    };
  }

  const rawContent = llmResponse.choices?.[0]?.message?.content;
  if (!rawContent) {
    return { status: "llm_failed", topicSlug: topic.slug, articleId: null, errorReason: "empty response" };
  }

  // 4. Validation
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return {
      status: "validation_failed",
      topicSlug: topic.slug,
      articleId: null,
      errorReason: "JSON parse failed",
    };
  }

  if (!isDraftJsonShape(parsed)) {
    return {
      status: "validation_failed",
      topicSlug: topic.slug,
      articleId: null,
      errorReason: "shape mismatch",
    };
  }

  // URL whitelist: every sourceNote URL must be in the Exa results.
  const invalidUrls = parsed.sourceNotes
    .map((note) => note.url)
    .filter((url) => !allowedUrls.has(url));

  if (invalidUrls.length > 0) {
    return {
      status: "validation_failed",
      topicSlug: topic.slug,
      articleId: null,
      errorReason: `hallucinated URLs: ${invalidUrls.slice(0, 3).join(", ")}`,
    };
  }

  // 5. Strapi post
  const topicId = await findStrapiTopicId(topic.slug);
  const authorId = await findStrapiAuthorIdBySlug("ai-drafter");

  if (!topicId || !authorId) {
    return {
      status: "strapi_failed",
      topicSlug: topic.slug,
      articleId: null,
      errorReason: !topicId ? "topic id missing in Strapi" : "ai-drafter author missing in Strapi",
    };
  }

  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, "").slice(0, 13);
  const slug = `ai-draft-${topic.slug}-${stamp}`;

  const articleBody = {
    data: {
      title: parsed.title,
      slug,
      summary: parsed.summary,
      readTime: `${Math.max(3, Math.round(parsed.body.length / 1100))} min read`,
      storyType: "reporting",
      body: parsed.body,
      sources: parsed.sourceNotes.map((note) => note.text),
      featured: false,
      deepDive: false,
      format: "data-led",
      executiveSummary: parsed.executiveSummary.map((text) => ({ text })),
      sourceNotes: parsed.sourceNotes.map((note) => ({ text: note.text, url: note.url })),
      publishedOn: now.toISOString(),
      author: authorId,
      topic: topicId,
      publishedAt: null,
    },
  };

  try {
    const response = await fetch(`${normaliseBaseUrl(STRAPI_URL)}/api/articles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify(articleBody),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        status: "strapi_failed",
        topicSlug: topic.slug,
        articleId: null,
        errorReason: `Strapi HTTP ${response.status}: ${text.slice(0, 200)}`,
      };
    }

    const data = (await response.json()) as { data?: { id?: number } };
    return {
      status: "posted",
      topicSlug: topic.slug,
      articleId: data.data?.id ?? null,
    };
  } catch (error) {
    return {
      status: "strapi_failed",
      topicSlug: topic.slug,
      articleId: null,
      errorReason: error instanceof Error ? error.message : "network",
    };
  }
}
```

- [ ] **Step 2: Build to verify**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/draft-writer.ts
git commit -m "Add draft-writer pipeline: random topic + Exa + LLM + URL whitelist + Strapi post"
```

---

## Task 2: Create the API endpoint

**Files:**
- Create: `src/app/api/internal/draft-writer/route.ts`

- [ ] **Step 1: Write the route**

```ts
import "server-only";
import { NextResponse } from "next/server";
import { runDrafterPipeline } from "@/lib/draft-writer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. Kill switch
  if (process.env.DRAFT_WRITER_ENABLED !== "true") {
    return NextResponse.json({ error: "disabled" }, { status: 503 });
  }

  // 2. Shared-secret auth
  const expected = process.env.DRAFT_WRITER_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "secret-not-configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 3. Run pipeline
  const result = await runDrafterPipeline();
  return NextResponse.json(result);
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/internal/draft-writer/route.ts
git commit -m "Add POST /api/internal/draft-writer endpoint with kill-switch and shared-secret auth"
```

---

## Task 3: Add the GitHub Actions workflow

**Files:**
- Create: `.github/workflows/draft-writer.yml`

- [ ] **Step 1: Create the workflow**

```yaml
name: AI draft writer

on:
  schedule:
    - cron: "0 */6 * * *"  # 00:00, 06:00, 12:00, 18:00 UTC
  workflow_dispatch:        # manual trigger from the GitHub UI

jobs:
  draft:
    runs-on: ubuntu-latest
    steps:
      - name: POST to draft-writer endpoint
        env:
          DRAFT_WRITER_SECRET: ${{ secrets.DRAFT_WRITER_SECRET }}
          DRAFT_WRITER_URL: ${{ secrets.DRAFT_WRITER_URL }}
        run: |
          if [ -z "${DRAFT_WRITER_URL:-}" ]; then
            echo "DRAFT_WRITER_URL secret is not set" >&2
            exit 1
          fi
          if [ -z "${DRAFT_WRITER_SECRET:-}" ]; then
            echo "DRAFT_WRITER_SECRET secret is not set" >&2
            exit 1
          fi
          curl --fail --silent --show-error \
            -X POST \
            -H "Authorization: Bearer ${DRAFT_WRITER_SECRET}" \
            -H "Content-Type: application/json" \
            "${DRAFT_WRITER_URL}"
```

Two new repo secrets needed:
- `DRAFT_WRITER_SECRET` — random string (e.g., `openssl rand -hex 32`).
- `DRAFT_WRITER_URL` — `https://sanenews.net/api/internal/draft-writer`.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/draft-writer.yml
git commit -m "Add GitHub Actions cron to invoke draft-writer every 6 hours"
```

---

## Task 4: Add env-var and seed documentation

**Files:**
- Modify: `docs/google-cloud.md`

- [ ] **Step 1: Update the Frontend environment values section**

In `docs/google-cloud.md`, find Section 9 "Production Environment Values" → "Frontend environment values" (around line 220). Append two entries:

```markdown
- `DRAFT_WRITER_ENABLED` (set to `true` to enable the cron drafter; default off)
- `DRAFT_WRITER_SECRET` (shared secret matching the GitHub Actions secret)
```

- [ ] **Step 2: Update the Post-Deploy Checklist**

Find Section 12 (Post-Deploy Checklist, around line 308). Append:

```markdown
6. Seed the `ai-drafter` Strapi author (one-time) — Content Manager → Author → Create new entry with name "AI research drafter", slug `ai-drafter`, role "Drafter", bio "Internal research scaffold — never published as-is. All AI-drafted articles require editorial review and rewrite before publication.", credentials "Machine-generated; review required." Save and Publish.
7. Set `DRAFT_WRITER_ENABLED=true` on the frontend Cloud Run service and store `DRAFT_WRITER_SECRET` in Secret Manager.
8. In GitHub repo Settings → Secrets, set `DRAFT_WRITER_SECRET` (matches the Cloud Run env) and `DRAFT_WRITER_URL=https://sanenews.net/api/internal/draft-writer`.
9. Test by going to GitHub Actions → AI draft writer → Run workflow. Confirm a draft article appears in Strapi with author "AI research drafter" and `publishedAt` null.
10. After confirming drafts appear and editors are mining them, the 6-hour cron continues automatically.
```

- [ ] **Step 3: Commit**

```bash
git add docs/google-cloud.md
git commit -m "Document DRAFT_WRITER env vars and ai-drafter author seed steps"
```

---

## Task 5: Local test — bad-auth, disabled, and validation paths

**Files:**
- None modified — verification only.

- [ ] **Step 1: Start dev server with the drafter disabled**

```bash
DRAFT_WRITER_ENABLED= DRAFT_WRITER_SECRET=test-secret npm run dev
```

In a second terminal:

```bash
curl -i -X POST -H "Authorization: Bearer test-secret" http://localhost:3000/api/internal/draft-writer
```

Expected: `HTTP/1.1 503` with body `{"error":"disabled"}`.

- [ ] **Step 2: Restart with the drafter enabled but wrong secret**

Stop the dev server. Restart:

```bash
DRAFT_WRITER_ENABLED=true DRAFT_WRITER_SECRET=correct-secret npm run dev
```

```bash
curl -i -X POST -H "Authorization: Bearer wrong-secret" http://localhost:3000/api/internal/draft-writer
```

Expected: `HTTP/1.1 401` with body `{"error":"unauthorized"}`.

- [ ] **Step 3: Correct secret but missing API keys**

(Assuming OPENAI_API_KEY/STRAPI_API_TOKEN aren't set locally.)

```bash
curl -i -X POST -H "Authorization: Bearer correct-secret" http://localhost:3000/api/internal/draft-writer
```

Expected: `HTTP/1.1 200` with body shape `{"status":"strapi_failed","topicSlug":"","articleId":null,"errorReason":"missing env: ..."}`.

If you have all three keys set locally and a running Strapi with the seeded `ai-drafter` author, the same call should return `{"status":"posted","topicSlug":"<some-slug>","articleId":<id>}`.

- [ ] **Step 4: Full pipeline test (optional, requires production-like env)**

If you want to exercise the full pipeline, ensure:

1. `OPENAI_API_KEY` is set with credit.
2. `EXA_API_KEY` is set.
3. `NEXT_PUBLIC_STRAPI_URL` and `STRAPI_API_TOKEN` point at a Strapi with the `ai-drafter` author seeded.
4. Spec 1 Phase B has shipped (so the article schema has `executiveSummary`, `sourceNotes`, etc.).

Then hit the endpoint as above. Verify the new draft appears in Strapi admin with `publishedAt: null`. Open it; confirm executive summary bullets, body prose, source notes are all present and the URLs match what was in the Exa results.

If validation fails repeatedly (e.g., the LLM keeps hallucinating URLs), the model may need a different prompt — but that's a tuning task, not a plan issue.

---

## Task 6: Final commit + status

**Files:**
- None.

- [ ] **Step 1: Final git status check**

```bash
git status
git log --oneline -10
```

Expected: working tree clean. Last 4 commits roughly: "Add draft-writer pipeline" → "Add POST /api/internal/draft-writer endpoint" → "Add GitHub Actions cron" → "Document DRAFT_WRITER env vars and ai-drafter author seed".

- [ ] **Step 2: No further commits**

Spec 2 is complete in code. The remaining work is operational: set the env vars on Cloud Run, set the GitHub Actions secrets, seed the Strapi author, then flip `DRAFT_WRITER_ENABLED=true`. Those are deploy-time concerns, not code.

---

## After Spec 2

Drafts will appear in Strapi every 6 hours once enabled. Editors mine them for leads, sourcing pointers, and topic gaps. Nothing AI-written reaches readers without editorial review and a rewrite.

Spec 3 (community contributions with AI critique) is independent of this and gives readers — not LLMs — a path to publish. Plan it next.
