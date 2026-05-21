# Design: AI drafter — internal research leads

**Date:** 2026-05-22
**Status:** Draft — awaiting review
**Driver:** User asked for scheduled AI writers every 6 hours. After scoping, the feature is *not* a publisher — it's an internal research-leads pipeline. AI-drafted articles go to Strapi as drafts that staff editors mine for angles, sourcing pointers, and topic gaps. Nothing AI-written is ever published as-is on the public site.

---

## 1. Scope

In scope:

- Scheduled cron every 6 hours that runs an AI drafter pipeline.
- Pipeline pulls real news context via the existing Exa integration, calls OpenAI to produce a structured JSON draft, and posts the draft to Strapi (publishedAt null).
- A strict guardrail that rejects the run if the LLM proposes citation URLs that aren't present in the Exa results.
- A kill switch env var so the drafter can be paused without a redeploy of the cron.

Explicitly out of scope:

- Any public surface for AI-drafted articles. Drafts never appear on the site.
- Custom in-app admin review UI. Strapi's built-in admin is the review surface.
- Email/Slack digest notifications. Editors check Strapi when they want to.
- Cloud Scheduler + Cloud Run job. GitHub Actions cron is enough at this cadence.
- Lead exhibit chart generation. LLMs producing unverifiable chart series is a brand risk on a data-led site; editors add charts manually if a draft is worth promoting.
- Signed deep-link review tokens, admin role expansion, telemetry JSONL.
- Source verification UI helpers. Strapi's link previews and the editor's own browser are enough.

Framing matters: this feature exists so the newsroom has a steady stream of research leads on under-covered topics. Drafts are scaffolds, not articles. Treating them as articles waiting for approval would invite the very brand risk that landed Spec 1.

---

## 2. Architecture

Three small pieces:

1. **GitHub Actions workflow** at `.github/workflows/draft-writer.yml` that runs on a cron schedule (every 6 hours). It curls `POST /api/internal/draft-writer` with a shared-secret header.
2. **Next.js route** at `src/app/api/internal/draft-writer/route.ts`. Verifies the shared secret, runs the drafter pipeline, returns a one-line summary.
3. **Drafter pipeline** at `src/lib/draft-writer.ts`. Imports the existing Exa helper from [src/lib/exa-news.ts](src/lib/exa-news.ts) and the editorial-standards block from [src/lib/assistant-llm.ts](src/lib/assistant-llm.ts). Posts to Strapi using the existing token-based API.

No new infrastructure. No new auth surfaces. No new env vars except `DRAFT_WRITER_SECRET` (shared secret) and `DRAFT_WRITER_ENABLED` (kill switch). Everything else reuses what's already configured.

---

## 3. GitHub Actions workflow

`.github/workflows/draft-writer.yml`:

```yaml
name: AI draft writer
on:
  schedule:
    - cron: "0 */6 * * *"  # 00:00, 06:00, 12:00, 18:00 UTC
  workflow_dispatch:        # manual trigger
jobs:
  draft:
    runs-on: ubuntu-latest
    steps:
      - name: POST to draft-writer endpoint
        env:
          DRAFT_WRITER_SECRET: ${{ secrets.DRAFT_WRITER_SECRET }}
        run: |
          curl --fail --silent --show-error \
            -X POST \
            -H "Authorization: Bearer $DRAFT_WRITER_SECRET" \
            -H "Content-Type: application/json" \
            https://sanenews.net/api/internal/draft-writer
```

Two new GitHub repo secrets: `DRAFT_WRITER_SECRET`. `workflow_dispatch` is included so an editor can trigger a run manually without waiting for the cron.

---

## 4. API route

`src/app/api/internal/draft-writer/route.ts`:

```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. Kill switch
  if (process.env.DRAFT_WRITER_ENABLED !== "true") {
    return Response.json({ error: "disabled" }, { status: 503 });
  }

  // 2. Shared-secret auth
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${process.env.DRAFT_WRITER_SECRET}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // 3. Run pipeline
  const result = await runDrafterPipeline();
  return Response.json(result);
}
```

Returns `{ status, topic, articleId? }`. The endpoint does nothing else — no HTML, no caching, no CORS.

---

## 5. Drafter pipeline (`src/lib/draft-writer.ts`)

Self-contained module. Each invocation runs:

**1. Topic selection.** Random pick from the non-`music-arts` topics. Random is fine at this scope — gap-based selection was overengineering. (`music-arts` is excluded because the drafter produces `format: 'data-led'` content; the soft corner is staff-only by design.)

**2. Exa retrieval.** Reuses `searchPersonalizedNewsWithExa` from [src/lib/exa-news.ts](src/lib/exa-news.ts) with a synthesised minimal profile (selected topic, no keywords, all story types, `numResults: 10`). Skip the run if Exa returns nothing.

**3. LLM call.** OpenAI chat completion. System prompt = `EDITORIAL_STANDARDS_BLOCK` from [assistant-llm.ts:34-111](src/lib/assistant-llm.ts#L34-L111) + a short drafter-specific contract:

> "Produce a JSON object matching this exact shape: `{ title, summary, body, executiveSummary: string[3..5], sourceNotes: { text, url }[1..] }`. Every URL in `sourceNotes` MUST be a URL present in the supplied Exa results. Do not invent URLs. The body should be 400–700 words of plain prose. No HTML except `<p>` tags."

Temperature 0.3, max_tokens 3000. Prompt cache key `common-ground-drafter:v1` so the system prompt caches across invocations (matches the existing pattern in [assistant-llm.ts:180](src/lib/assistant-llm.ts#L180)).

**4. JSON validation.** Reject the run (don't post, return `status: 'validation_failed'`) if any of:

- JSON parse fails.
- `title` missing or longer than 200 chars.
- `executiveSummary` not 3–5 strings.
- `sourceNotes` empty.
- Any URL in `sourceNotes` is not present in the Exa results URL set (the load-bearing hallucination guard).
- `body` shorter than 300 chars (sign the LLM bailed out).

**5. Strapi post.** POST to the Strapi `articles` REST API with:

```json
{
  "title": "...",
  "slug": "ai-draft-{topic-slug}-{yyyymmdd-hhmm}",
  "summary": "...",
  "body": "...",
  "executiveSummary": [...],
  "sourceNotes": [...],
  "storyType": "reporting",
  "format": "data-led",
  "deepDive": false,
  "topic": <topic-id>,
  "author": <ai-drafter-author-id>,
  "publishedAt": null
}
```

`publishedAt: null` marks it as a Strapi draft. Returns the new article ID.

**6. Return.** Pipeline returns `{ status: 'posted' | 'validation_failed' | 'exa_empty' | 'llm_failed', topic, articleId | null, errorReason?: string }`. The endpoint relays this to the GitHub Actions log (and any human running `workflow_dispatch`).

---

## 6. Strapi seeding

One-time setup (manual, documented in [docs/google-cloud.md](docs/google-cloud.md) as a checklist item):

1. Create a Strapi author `ai-drafter` with name "AI research drafter", bio "Internal research scaffold — never published as-is. All AI-drafted articles require editorial review and rewrite before publication.", role "Drafter", credentials "Machine-generated; review required."
2. Editors filter Strapi's article list by `author.slug === 'ai-drafter'` to find drafts to review.

No new content types, no new fields beyond what Spec 1's Phase B already adds (`executiveSummary`, `sourceNotes`, `format`, `deepDive`). Spec 2 depends on Spec 1 Phase B being shipped.

---

## 7. Operational concerns

- **Cost cap.** A 6-hour cadence at ~3000 max tokens per run with `gpt-4.1-mini` ≈ $0.05–$0.15 per run, $0.20–$0.60/day. Trivial. If it grows, add a per-day counter in a small KV store or just flip `DRAFT_WRITER_ENABLED=false`.
- **Failure handling.** Network/LLM/Strapi failures: the pipeline returns a status code, the endpoint logs it, GitHub Actions records the curl result. No retries inside the pipeline — the next cron tick will try again.
- **Idempotency.** The 6-hour cadence is loose enough that duplicate runs aren't a real concern. The slug includes a timestamp, so even back-to-back runs produce distinct draft rows.
- **Brand risk if a draft leaks.** Drafts have `publishedAt: null` and the Strapi public read API filters them. Verify after deploy: hitting `/api/articles?filters[author][slug][$eq]=ai-drafter` returns an empty data array.

---

## 8. Testing

- Manual workflow_dispatch trigger after deploy. Confirm a draft appears in Strapi with the expected fields.
- Public read API smoke: confirm AI drafts don't appear on `/articles` or any homepage surface.
- Bad-secret test: curl with a wrong bearer returns 401.
- Disabled test: set `DRAFT_WRITER_ENABLED=false`, trigger the workflow, confirm it returns 503 and no draft is posted.
- Hallucination guard: hand-construct an Exa response with one URL, mock an LLM response that proposes a different URL, confirm pipeline returns `validation_failed` and no draft is posted.

No automated test harness changes — same posture as Spec 1.

---

## 9. Dependencies and sequencing

- **Spec 1 Phase B must ship first.** The drafter posts articles with `executiveSummary`, `sourceNotes`, `format`, and `deepDive` fields. Those don't exist on the article schema until Phase B is in.
- Once Phase B is in, Spec 2 can ship independently of Phase A and Phase C.

---

## 10. What this design refused to do (and why)

These were considered and explicitly cut. If you want any of them later, they're separate work:

| Refused | Why |
|---|---|
| Cloud Scheduler + Cloud Run job | GitHub Actions cron exists in the repo and costs $0. |
| Custom in-app admin review UI | Strapi admin already provides draft listing, edit, publish, and role-based access. |
| Email/Slack digest of new drafts | Editors check Strapi when they want to. Notifications are a separate product. |
| Deep-link signed review tokens | Same — Strapi auth handles access control. |
| Lead exhibit chart generation by the LLM | The LLM cannot verify chart data; data-led articles must not ship LLM-invented quantitative claims. Editor adds the chart manually. |
| Gap-based topic selection | Random is fine at 4 runs/day with 9 topics. Over-engineering. |
| Telemetry JSONL pipeline | GitHub Actions logs and Strapi's audit log are enough. |

The spec deliberately stays narrow. Each refused item is an expansion the codebase can absorb later when there's a real reason — not a hypothetical one.
