# Community Contributions + AI Critique (Spec 3) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/voices` community surface. Logged-in readers can apply to be contributors. After editor approval, contributors can submit short essays through an in-site composer with an async "Critique my draft" button that calls OpenAI for editorial coaching. Submitted drafts post to Strapi as light-format articles with `sourceType: 'community'`. Editors review and publish through Strapi admin. Published pieces live at `/voices`, structurally separated from staff reporting on `/articles`.

**Architecture:** New `contributor-application` Strapi content type. New `sourceType` and `contributorByline` fields on `article`. New `bio` field on users-permissions user. New `contributor` Strapi role. Four new public routes (`/voices`, `/voices/[slug]`, `/voices/by/[slug]`, `/voices/apply`, `/voices/compose`). Three new API endpoints (`/api/voices/apply`, `/api/voices/critique`, `/api/voices/submit`). Composer reuses OpenAI client from `src/lib/assistant-llm.ts`.

**Tech Stack:** Next.js App Router, Strapi 5 users-permissions, OpenAI Chat Completions, existing reader-session auth. No new external dependencies.

**Testing posture:** Build → manually verify → commit.

**Depends on:** Spec 1 Phase B shipped (article schema has `format` field; community pieces default to `light`).

---

## File structure

**Strapi (new files):**

- `strapi/src/api/contributor-application/content-types/contributor-application/schema.json`
- `strapi/src/api/contributor-application/controllers/contributor-application.ts`
- `strapi/src/api/contributor-application/routes/contributor-application.ts`
- `strapi/src/api/contributor-application/services/contributor-application.ts`

**Strapi (modified):**

- `strapi/src/api/article/content-types/article/schema.json` — add `sourceType` and `contributorByline`.
- `strapi/src/extensions/users-permissions/content-types/user/schema.json` — add `bio` field (creating the extension file if absent).

**Frontend (new files):**

- `src/lib/voices-llm.ts` — critique prompt + OpenAI call.
- `src/lib/voices-rate-limit.ts` — shared in-memory rate limiter.
- `src/app/voices/page.tsx` — index.
- `src/app/voices/[slug]/page.tsx` — individual contribution.
- `src/app/voices/by/[slug]/page.tsx` — contributor profile.
- `src/app/voices/apply/page.tsx` — application form.
- `src/app/voices/compose/page.tsx` — composer (client component imported here).
- `src/components/voices-composer.tsx` — composer UI (client).
- `src/app/api/voices/apply/route.ts`
- `src/app/api/voices/critique/route.ts`
- `src/app/api/voices/submit/route.ts`

**Frontend (modified):**

- `src/content/site.ts` — add `Voice` type fields, update nav.
- `src/lib/cms.ts` — `getVoices`, `getVoiceBySlug`, `getVoicesByAuthor`, add `sourceType` to `mapArticle`, add `includeCommunity` toggle, add `getPodcastRecommendationsByTopic` already exists; update existing surfaces to exclude `sourceType === 'community'`.
- `src/app/topics/[slug]/page.tsx` — "From the community" rail.
- `src/app/globals.css` — styles.

---

## Task 1: Add `contributor-application` Strapi content type

**Files:**
- Create: `strapi/src/api/contributor-application/content-types/contributor-application/schema.json`
- Create: `strapi/src/api/contributor-application/controllers/contributor-application.ts`
- Create: `strapi/src/api/contributor-application/routes/contributor-application.ts`
- Create: `strapi/src/api/contributor-application/services/contributor-application.ts`

- [ ] **Step 1: Create schema**

`strapi/src/api/contributor-application/content-types/contributor-application/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "contributor_applications",
  "info": {
    "singularName": "contributor-application",
    "pluralName": "contributor-applications",
    "displayName": "Contributor Application",
    "description": "Reader application to join the community-contributor program"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "user": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user"
    },
    "email": {
      "type": "string",
      "required": true
    },
    "displayName": {
      "type": "string",
      "required": true
    },
    "pitch": {
      "type": "text",
      "required": true
    },
    "priorWriting": {
      "type": "text"
    },
    "status": {
      "type": "enumeration",
      "enum": ["pending", "approved", "rejected"],
      "default": "pending",
      "required": true
    },
    "reviewNote": {
      "type": "text"
    },
    "submittedAt": {
      "type": "datetime",
      "required": true
    },
    "reviewedAt": {
      "type": "datetime"
    }
  }
}
```

- [ ] **Step 2: Create controller / router / service (auto-generated patterns)**

```ts
// strapi/src/api/contributor-application/controllers/contributor-application.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::contributor-application.contributor-application');
```

```ts
// strapi/src/api/contributor-application/routes/contributor-application.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::contributor-application.contributor-application');
```

```ts
// strapi/src/api/contributor-application/services/contributor-application.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreService('api::contributor-application.contributor-application');
```

- [ ] **Step 3: Build**

```bash
cd strapi && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add strapi/src/api/contributor-application/
git commit -m "Add contributor-application Strapi content type"
```

---

## Task 2: Add `sourceType` and `contributorByline` to article schema

**Files:**
- Modify: `strapi/src/api/article/content-types/article/schema.json`

- [ ] **Step 1: Add the fields**

Inside the `attributes` block, add:

```json
"sourceType": {
  "type": "enumeration",
  "enum": ["staff", "community"],
  "default": "staff",
  "required": true
},
"contributorByline": {
  "type": "string"
}
```

- [ ] **Step 2: Build**

```bash
cd strapi && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add strapi/src/api/article/content-types/article/schema.json
git commit -m "Add sourceType and contributorByline fields to article schema"
```

---

## Task 3: Add `bio` field to the Strapi user

**Files:**
- Create: `strapi/src/extensions/users-permissions/content-types/user/schema.json`

- [ ] **Step 1: Create the extension schema**

This is Strapi's way to extend plugin content types. The file should mirror the existing user schema and add the new `bio` field. Create `strapi/src/extensions/users-permissions/content-types/user/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "up_users",
  "info": {
    "name": "user",
    "description": "",
    "singularName": "user",
    "pluralName": "users",
    "displayName": "User"
  },
  "options": {
    "draftAndPublish": false,
    "timestamps": true
  },
  "attributes": {
    "username": { "type": "string", "minLength": 3, "unique": true, "configurable": false, "required": true },
    "email": { "type": "email", "minLength": 6, "configurable": false, "required": true },
    "provider": { "type": "string", "configurable": false },
    "password": { "type": "password", "minLength": 6, "configurable": false, "private": true, "searchable": false },
    "resetPasswordToken": { "type": "string", "configurable": false, "private": true, "searchable": false },
    "confirmationToken": { "type": "string", "configurable": false, "private": true, "searchable": false },
    "confirmed": { "type": "boolean", "default": false, "configurable": false },
    "blocked": { "type": "boolean", "default": false, "configurable": false },
    "role": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.role", "inversedBy": "users", "configurable": false },
    "bio": { "type": "text", "maxLength": 600 }
  }
}
```

- [ ] **Step 2: Build Strapi**

```bash
cd strapi && npm run build
```

Expected: build succeeds. The user content type now has the `bio` field.

- [ ] **Step 3: Commit**

```bash
git add strapi/src/extensions/users-permissions/content-types/user/schema.json
git commit -m "Extend users-permissions user with optional bio field"
```

---

## Task 4: Update CMS lib for `sourceType`, voices lookup, community exclusion

**Files:**
- Modify: `src/lib/cms.ts`
- Modify: `src/content/site.ts`

- [ ] **Step 1: Update the `Article` type**

In `src/content/site.ts`, add to the `Article` type:

```ts
sourceType: "staff" | "community";
contributorByline?: string;
```

The fallback articles in the same file need to declare `sourceType: "staff"`. Add to each of the 4 fallback article objects (alongside `format: "data-led"`).

- [ ] **Step 2: Update `mapArticle` in cms.ts**

In `mapArticle`, around where format is mapped:

```ts
const sourceType = entity.sourceType;
const contributorByline = entity.contributorByline;
```

In the returned object:

```ts
sourceType: sourceType === "community" ? "community" : "staff",
contributorByline: typeof contributorByline === "string" ? contributorByline : undefined,
```

- [ ] **Step 3: Add `includeCommunity` filter to relevant query helpers**

Add a helper near the top of cms.ts:

```ts
type CommunityFilter = { includeCommunity?: boolean };
```

Update `QueryOptions`:

```ts
type QueryOptions = {
  preview?: boolean;
  fallbackToLocal?: boolean;
  includeCommunity?: boolean;
};
```

Add a `filterByCommunityVisibility` helper:

```ts
function filterByCommunityVisibility(
  articles: Article[],
  options: QueryOptions,
): Article[] {
  if (options.includeCommunity) return articles;
  return articles.filter((article) => article.sourceType !== "community");
}
```

Apply it inside `getArticles`, `getFeaturedArticle`, `getDeepDiveArticle`, `getLatestArticles`, `getArticlesByTopic`, and `getArticlesByAuthor` — each just wraps its existing return:

```ts
return filterByCommunityVisibility(sortedArticles, options);
```

Specifically, in `getArticles`, the return becomes:

```ts
return filterByCommunityVisibility(
  mapped.length > 0 ? sortArticles(mapped) : sortArticles(fallbackArticles),
  options,
);
```

Apply the same pattern to the other functions.

- [ ] **Step 4: Add voices-specific lookup helpers**

After `getArticles`, add:

```ts
export async function getVoices(options: QueryOptions = {}): Promise<Article[]> {
  const allArticles = await getArticles({ ...options, includeCommunity: true });
  return allArticles.filter((article) => article.sourceType === "community");
}

export async function getVoiceBySlug(
  slug: string,
  options: QueryOptions = {},
): Promise<Article | null> {
  const article = await getArticleBySlug(slug, { ...options, includeCommunity: true });
  if (!article || article.sourceType !== "community") return null;
  return article;
}

export async function getVoicesByContributor(
  contributorUserId: number | string,
  options: QueryOptions = {},
): Promise<Article[]> {
  // For v1, contributor pieces are identified by the contributorByline field.
  // A future iteration could link them to a user relation.
  const allVoices = await getVoices(options);
  return allVoices.filter((article) =>
    article.contributorByline?.startsWith(String(contributorUserId)),
  );
}
```

(Note on `getVoicesByContributor`: v1 stores the byline as a string and doesn't relate articles to user IDs. The function exists for shape but `/voices/by/[slug]` uses a simpler byline-string match in the page — see Task 9.)

- [ ] **Step 5: Build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/cms.ts src/content/site.ts
git commit -m "Add sourceType to articles, getVoices helpers, exclude community from staff surfaces"
```

---

## Task 5: Add the AI critique helper (`src/lib/voices-llm.ts`)

**Files:**
- Create: `src/lib/voices-llm.ts`

- [ ] **Step 1: Write the module**

```ts
import "server-only";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
const PROMPT_CACHE_KEY = "common-ground-voices-critique:v1";

const CRITIQUE_SYSTEM_PROMPT = `
Common Ground is an advertisement-free public-interest news portal. Its
editorial rules are:

1. Headlines inform before they persuade. Never use fear-based framing
   or rhetorical devices designed to trigger clicks.
2. Every claim should be traceable to its origin. Prefer primary
   records and named interviews over summaries.
3. Story placement reflects civic value, not engagement metrics.
4. Corrections are transparent. Acknowledge uncertainty explicitly.

You are an editor coaching a community contributor. Read the draft they
provide. Return a short written critique (250-500 words, plain prose,
no bullet list unless the contributor asks for one).

Cover:
- Where the argument is clear and where it isn't.
- Which claims need a source.
- Which sentences feel padded, vague, or rhetorical.
- Whether the length is right for the substance.
- What one revision would most improve the piece.

Be specific and kind. The goal is to help them write better, not to
gatekeep. Never rewrite the draft for them. Never say the draft is
good if it isn't.
`.trim();

export type CritiqueResult =
  | { ok: true; critique: string; model: string }
  | { ok: false; error: string };

export async function critiqueDraft(input: {
  title: string;
  body: string;
  sourceUrls: string[];
}): Promise<CritiqueResult> {
  if (!OPENAI_API_KEY) {
    return { ok: false, error: "openai-not-configured" };
  }

  try {
    const response = await fetch(`${OPENAI_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.4,
        prompt_cache_key: PROMPT_CACHE_KEY,
        messages: [
          { role: "system", content: CRITIQUE_SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              title: input.title,
              body: input.body,
              sourceUrls: input.sourceUrls,
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      return { ok: false, error: `openai-http-${response.status}` };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const critique = data.choices?.[0]?.message?.content?.trim();
    if (!critique) return { ok: false, error: "empty-response" };

    return { ok: true, critique, model: OPENAI_MODEL };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "network",
    };
  }
}
```

- [ ] **Step 2: Build and commit**

```bash
npm run build
git add src/lib/voices-llm.ts
git commit -m "Add voices-llm critique helper using existing OpenAI client pattern"
```

---

## Task 6: Add the shared in-memory rate limiter

**Files:**
- Create: `src/lib/voices-rate-limit.ts`

- [ ] **Step 1: Write the module**

```ts
import "server-only";

type LimiterBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, LimiterBucket>();

export type LimitDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

/**
 * Sliding-window rate limit. Each `key` is allowed `max` events per
 * `windowMs`. Internal map auto-prunes when oversized.
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): LimitDecision {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });

    if (buckets.size > 2048) {
      for (const [k, b] of buckets.entries()) {
        if (b.resetAt < now) buckets.delete(k);
      }
    }

    return { allowed: true, remaining: max - 1 };
  }

  if (bucket.count >= max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.round((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, remaining: max - bucket.count };
}
```

- [ ] **Step 2: Build and commit**

```bash
npm run build
git add src/lib/voices-rate-limit.ts
git commit -m "Add in-memory rate limiter for voices endpoints"
```

---

## Task 7: Application endpoint and page

**Files:**
- Create: `src/app/api/voices/apply/route.ts`
- Create: `src/app/voices/apply/page.tsx`

- [ ] **Step 1: Write the application endpoint**

```ts
// src/app/api/voices/apply/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { rateLimit } from "@/lib/voices-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? process.env.STRAPI_URL;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const APPLY_LIMIT_WINDOW_MS = 30 * ONE_DAY_MS;

function normaliseBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export async function POST(request: Request) {
  if (!STRAPI_URL) {
    return NextResponse.json({ error: "service-unavailable" }, { status: 503 });
  }

  // Auth: reuse the reader session cookie set by /api/auth/login
  const cookieStore = await cookies();
  const sessionJwt = cookieStore.get("cg-reader-session")?.value;
  if (!sessionJwt) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: { displayName?: unknown; pitch?: unknown; priorWriting?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const displayName = typeof payload.displayName === "string" ? payload.displayName.trim() : "";
  const pitch = typeof payload.pitch === "string" ? payload.pitch.trim() : "";
  const priorWriting =
    typeof payload.priorWriting === "string" ? payload.priorWriting.trim() : undefined;

  if (displayName.length === 0 || displayName.length > 80) {
    return NextResponse.json({ error: "displayName invalid" }, { status: 400 });
  }
  if (pitch.length < 100 || pitch.length > 1500) {
    return NextResponse.json({ error: "pitch length must be 100-1500" }, { status: 400 });
  }

  // Get the user via /api/users/me to capture id and email for the application row.
  const meResponse = await fetch(`${normaliseBaseUrl(STRAPI_URL)}/api/users/me`, {
    headers: { Authorization: `Bearer ${sessionJwt}` },
  });
  if (!meResponse.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const user = (await meResponse.json()) as { id: number; email: string };

  // 30-day per-user rate limit.
  const limit = rateLimit(`apply:${user.id}`, 1, APPLY_LIMIT_WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "already-applied", retryAfterSeconds: limit.retryAfterSeconds },
      { status: 429 },
    );
  }

  const createResponse = await fetch(
    `${normaliseBaseUrl(STRAPI_URL)}/api/contributor-applications`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionJwt}`,
      },
      body: JSON.stringify({
        data: {
          user: user.id,
          email: user.email,
          displayName,
          pitch,
          priorWriting,
          status: "pending",
          submittedAt: new Date().toISOString(),
        },
      }),
    },
  );

  if (!createResponse.ok) {
    return NextResponse.json({ error: "downstream-failed" }, { status: 502 });
  }

  return NextResponse.json({ status: "pending" });
}
```

- [ ] **Step 2: Write the application page**

```tsx
// src/app/voices/apply/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply to write for Voices",
  description:
    "Apply to join Common Ground's community-contributor program and publish short essays on Voices.",
};

export default function VoicesApplyPage() {
  return (
    <div className="page-stack">
      <section className="panel page-hero">
        <p className="eyebrow">Voices</p>
        <h1>Apply to contribute</h1>
        <p className="page-copy">
          Voices is where vetted readers publish short essays. We accept
          first-person pieces, considered arguments, and quiet reflections
          tied to public life. Approval is at editor discretion.
        </p>
      </section>

      <section className="panel">
        <form id="voices-apply-form" className="voices-form">
          <label className="voices-field">
            <span>Display name</span>
            <input
              className="voices-input"
              name="displayName"
              maxLength={80}
              required
            />
          </label>
          <label className="voices-field">
            <span>What do you want to write about, and why is your perspective useful? (100-1500 chars)</span>
            <textarea
              className="voices-textarea"
              name="pitch"
              minLength={100}
              maxLength={1500}
              rows={6}
              required
            />
          </label>
          <label className="voices-field">
            <span>Prior writing or links (optional)</span>
            <textarea
              className="voices-textarea"
              name="priorWriting"
              maxLength={500}
              rows={3}
            />
          </label>
          <button className="button-primary" type="submit">Submit application</button>
          <p className="voices-status" id="voices-apply-status" aria-live="polite" />
        </form>
      </section>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              var form = document.getElementById('voices-apply-form');
              var status = document.getElementById('voices-apply-status');
              if (!form || !status) return;
              form.addEventListener('submit', function (event) {
                event.preventDefault();
                status.textContent = 'Submitting...';
                var data = {
                  displayName: form.displayName.value,
                  pitch: form.pitch.value,
                  priorWriting: form.priorWriting.value || undefined,
                };
                fetch('/api/voices/apply', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data),
                }).then(function (resp) {
                  if (resp.status === 401) {
                    status.textContent = 'Please sign in first via /assistant.';
                    return;
                  }
                  if (resp.status === 429) {
                    status.textContent = 'You have already applied recently. Please wait.';
                    return;
                  }
                  if (!resp.ok) {
                    status.textContent = 'Submission failed. Please try again.';
                    return;
                  }
                  status.textContent = 'Application received. An editor will be in touch.';
                  form.reset();
                });
              });
            })();
          `,
        }}
      />
    </div>
  );
}
```

(The inline `<script>` is a small client interaction; a richer composer with React state is in Task 9. Keeping this page tiny and dependency-free.)

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/voices/apply/route.ts src/app/voices/apply/page.tsx
git commit -m "Add /voices/apply page and POST /api/voices/apply endpoint"
```

---

## Task 8: Critique endpoint

**Files:**
- Create: `src/app/api/voices/critique/route.ts`

- [ ] **Step 1: Write the endpoint**

```ts
import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { critiqueDraft } from "@/lib/voices-llm";
import { rateLimit } from "@/lib/voices-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const CRITIQUE_LIMIT_PER_DAY = 20;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionJwt = cookieStore.get("cg-reader-session")?.value;
  if (!sessionJwt) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: { title?: unknown; body?: unknown; sourceUrls?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  const sourceUrls = Array.isArray(payload.sourceUrls)
    ? payload.sourceUrls.filter((entry): entry is string => typeof entry === "string")
    : [];

  if (title.length === 0 || body.length < 100) {
    return NextResponse.json({ error: "draft-too-short" }, { status: 400 });
  }

  // Rate limit: 20 critiques per session JWT per day.
  const limit = rateLimit(`critique:${sessionJwt}`, CRITIQUE_LIMIT_PER_DAY, ONE_DAY_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "daily-limit", retryAfterSeconds: limit.retryAfterSeconds },
      { status: 429 },
    );
  }

  const result = await critiqueDraft({ title, body, sourceUrls });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ critique: result.critique, model: result.model });
}
```

- [ ] **Step 2: Build and commit**

```bash
npm run build
git add src/app/api/voices/critique/route.ts
git commit -m "Add POST /api/voices/critique endpoint with 20/day rate limit"
```

---

## Task 9: Composer page and component

**Files:**
- Create: `src/components/voices-composer.tsx`
- Create: `src/app/voices/compose/page.tsx`

- [ ] **Step 1: Write the composer component (client)**

```tsx
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY_PREFIX = "cg-voices-draft:";

type CritiqueState = "idle" | "loading" | "ready" | "error";
type SubmitState = "idle" | "submitting" | "submitted" | "error";

type VoicesComposerProps = {
  userId: number | string;
  topicOptions: { slug: string; name: string }[];
};

export function VoicesComposer({ userId, topicOptions }: VoicesComposerProps) {
  const storageKey = `${STORAGE_KEY_PREFIX}${userId}`;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [topicSlug, setTopicSlug] = useState("");
  const [sourceUrlsText, setSourceUrlsText] = useState("");

  const [critiqueState, setCritiqueState] = useState<CritiqueState>("idle");
  const [critique, setCritique] = useState("");
  const [critiqueError, setCritiqueError] = useState("");

  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState("");

  // Restore from localStorage on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      setTitle(parsed.title ?? "");
      setBody(parsed.body ?? "");
      setTopicSlug(parsed.topicSlug ?? "");
      setSourceUrlsText(parsed.sourceUrlsText ?? "");
    } catch {
      // ignore
    }
  }, [storageKey]);

  // Persist autosave.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ title, body, topicSlug, sourceUrlsText }),
    );
  }, [title, body, topicSlug, sourceUrlsText, storageKey]);

  function parsedSourceUrls(): string[] {
    return sourceUrlsText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  async function runCritique() {
    setCritiqueState("loading");
    setCritiqueError("");
    try {
      const response = await fetch("/api/voices/critique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, sourceUrls: parsedSourceUrls() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setCritiqueError(data.error ?? "critique-failed");
        setCritiqueState("error");
        return;
      }
      setCritique(data.critique);
      setCritiqueState("ready");
    } catch {
      setCritiqueError("network");
      setCritiqueState("error");
    }
  }

  async function submitDraft() {
    setSubmitState("submitting");
    setSubmitError("");
    try {
      const response = await fetch("/api/voices/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          topicSlug: topicSlug || null,
          sourceUrls: parsedSourceUrls(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSubmitError(data.error ?? "submit-failed");
        setSubmitState("error");
        return;
      }
      window.localStorage.removeItem(storageKey);
      setSubmitState("submitted");
    } catch {
      setSubmitError("network");
      setSubmitState("error");
    }
  }

  const bodyWordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const bodyWithinRange = bodyWordCount >= 400 && bodyWordCount <= 1200;

  if (submitState === "submitted") {
    return (
      <section className="panel voices-form">
        <p className="eyebrow">Voices composer</p>
        <h2>Submitted</h2>
        <p>An editor will review your piece. You can write another draft any time.</p>
      </section>
    );
  }

  return (
    <section className="panel voices-form">
      <p className="eyebrow">Voices composer</p>

      <label className="voices-field">
        <span>Title</span>
        <input
          className="voices-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
        />
      </label>

      <label className="voices-field">
        <span>Body (400-1200 words; you have {bodyWordCount})</span>
        <textarea
          className="voices-textarea voices-body-textarea"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={16}
        />
      </label>

      <label className="voices-field">
        <span>Topic (optional)</span>
        <select
          className="voices-input"
          value={topicSlug}
          onChange={(event) => setTopicSlug(event.target.value)}
        >
          <option value="">No topic</option>
          {topicOptions.map((topic) => (
            <option key={topic.slug} value={topic.slug}>{topic.name}</option>
          ))}
        </select>
      </label>

      <label className="voices-field">
        <span>Source URLs (one per line, optional)</span>
        <textarea
          className="voices-textarea"
          value={sourceUrlsText}
          onChange={(event) => setSourceUrlsText(event.target.value)}
          rows={4}
        />
      </label>

      <div className="voices-actions">
        <button
          className="button-secondary"
          type="button"
          onClick={() => void runCritique()}
          disabled={critiqueState === "loading" || title.length === 0 || body.length < 100}
        >
          {critiqueState === "loading" ? "Asking the AI editor..." : "Critique my draft"}
        </button>
        <button
          className="button-primary"
          type="button"
          onClick={() => void submitDraft()}
          disabled={submitState === "submitting" || !bodyWithinRange || title.length === 0}
        >
          {submitState === "submitting" ? "Submitting..." : "Submit for review"}
        </button>
      </div>

      {submitState === "error" ? (
        <p className="voices-status voices-status-error">Could not submit: {submitError}</p>
      ) : null}

      {critiqueState === "ready" ? (
        <section className="voices-critique">
          <p className="eyebrow">AI editorial critique</p>
          <p className="voices-critique-body">{critique}</p>
        </section>
      ) : null}
      {critiqueState === "error" ? (
        <p className="voices-status voices-status-error">Critique failed: {critiqueError}</p>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 2: Write the composer page (server)**

```tsx
// src/app/voices/compose/page.tsx
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { VoicesComposer } from "@/components/voices-composer";
import { getTopics } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Compose a community contribution",
};

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? process.env.STRAPI_URL;

function normaliseBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

async function getCurrentUserAndRole(jwt: string) {
  if (!STRAPI_URL) return null;
  try {
    const response = await fetch(`${normaliseBaseUrl(STRAPI_URL)}/api/users/me?populate=role`, {
      headers: { Authorization: `Bearer ${jwt}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as { id: number; email: string; role?: { name?: string } };
  } catch {
    return null;
  }
}

export default async function VoicesComposePage() {
  const cookieStore = await cookies();
  const sessionJwt = cookieStore.get("cg-reader-session")?.value;
  if (!sessionJwt) {
    redirect("/voices/apply");
  }

  const user = await getCurrentUserAndRole(sessionJwt);
  if (!user || user.role?.name !== "Contributor") {
    redirect("/voices/apply");
  }

  const topics = await getTopics();
  const topicOptions = topics.map((topic) => ({ slug: topic.slug, name: topic.name }));

  return (
    <div className="page-stack">
      <VoicesComposer userId={user.id} topicOptions={topicOptions} />
    </div>
  );
}
```

- [ ] **Step 3: Build and commit**

```bash
npm run build
git add src/components/voices-composer.tsx src/app/voices/compose/page.tsx
git commit -m "Add /voices/compose page and VoicesComposer client component"
```

---

## Task 10: Submit endpoint

**Files:**
- Create: `src/app/api/voices/submit/route.ts`

- [ ] **Step 1: Write the route**

```ts
import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? process.env.STRAPI_URL;

function normaliseBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export async function POST(request: Request) {
  if (!STRAPI_URL) {
    return NextResponse.json({ error: "service-unavailable" }, { status: 503 });
  }

  const cookieStore = await cookies();
  const sessionJwt = cookieStore.get("cg-reader-session")?.value;
  if (!sessionJwt) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: {
    title?: unknown;
    body?: unknown;
    topicSlug?: unknown;
    sourceUrls?: unknown;
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  const topicSlug = typeof payload.topicSlug === "string" ? payload.topicSlug : null;
  const sourceUrls = Array.isArray(payload.sourceUrls)
    ? payload.sourceUrls.filter((entry): entry is string => typeof entry === "string")
    : [];

  if (title.length < 10 || title.length > 200) {
    return NextResponse.json({ error: "title length 10-200" }, { status: 400 });
  }
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 400 || wordCount > 1200) {
    return NextResponse.json({ error: "body must be 400-1200 words" }, { status: 400 });
  }

  for (const url of sourceUrls) {
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: `invalid url: ${url}` }, { status: 400 });
    }
  }

  // Look up user, role, topic id.
  const meResponse = await fetch(
    `${normaliseBaseUrl(STRAPI_URL)}/api/users/me?populate=role`,
    { headers: { Authorization: `Bearer ${sessionJwt}` } },
  );
  if (!meResponse.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const user = (await meResponse.json()) as { id: number; username: string; role?: { name?: string } };
  if (user.role?.name !== "Contributor") {
    return NextResponse.json({ error: "not-contributor" }, { status: 403 });
  }

  let topicId: number | null = null;
  if (topicSlug) {
    const topicResponse = await fetch(
      `${normaliseBaseUrl(STRAPI_URL)}/api/topics?filters[slug][$eq]=${encodeURIComponent(topicSlug)}&pagination[limit]=1`,
      { headers: { Authorization: `Bearer ${sessionJwt}` } },
    );
    if (topicResponse.ok) {
      const topicData = (await topicResponse.json()) as { data?: Array<{ id?: number }> };
      topicId = topicData.data?.[0]?.id ?? null;
    }
  }

  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, "").slice(0, 13);
  const slug = `voices-${user.id}-${stamp}`;

  const createResponse = await fetch(`${normaliseBaseUrl(STRAPI_URL)}/api/articles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionJwt}`,
    },
    body: JSON.stringify({
      data: {
        title,
        slug,
        summary: body.slice(0, 240),
        readTime: `${Math.max(2, Math.round(wordCount / 220))} min read`,
        storyType: "opinion",
        body,
        sources: sourceUrls,
        sourceNotes: sourceUrls.map((url) => ({ text: url, url })),
        featured: false,
        deepDive: false,
        format: "light",
        sourceType: "community",
        contributorByline: `${user.id}:${user.username}`,
        publishedOn: now.toISOString(),
        topic: topicId,
        publishedAt: null,
      },
    }),
  });

  if (!createResponse.ok) {
    return NextResponse.json({ error: "downstream-failed" }, { status: 502 });
  }

  return NextResponse.json({ status: "submitted" });
}
```

(`contributorByline` is intentionally encoded as `<userId>:<username>` so `/voices/by/[slug]` can do a simple string match. Pure pragmatism for v1; future iteration can use a user relation.)

- [ ] **Step 2: Build and commit**

```bash
npm run build
git add src/app/api/voices/submit/route.ts
git commit -m "Add POST /api/voices/submit endpoint posting community drafts to Strapi"
```

---

## Task 11: `/voices` index page

**Files:**
- Create: `src/app/voices/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { getVoices } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Voices — reader contributions",
  description:
    "Vetted reader contributors publish short first-person essays on Voices. These are perspectives, not Common Ground reporting.",
};

export default async function VoicesIndexPage() {
  const voices = await getVoices();

  return (
    <div className="page-stack">
      <section className="panel page-hero">
        <p className="eyebrow">Voices</p>
        <h1>Reader contributions</h1>
        <p className="page-copy">
          Voices is where vetted readers publish first-person essays.
          These are individual perspectives, not Common Ground reporting.
        </p>
        <p className="page-copy">
          <Link className="text-link" href="/voices/apply">
            Apply to contribute
          </Link>
        </p>
      </section>

      {voices.length === 0 ? (
        <section className="panel">
          <p>No community contributions yet — be the first to apply.</p>
        </section>
      ) : (
        <section className="page-section">
          <div className="card-grid card-grid-two">
            {voices.map((article) => (
              <article className="voices-card" key={article.slug}>
                <p className="card-kicker">Reader contribution</p>
                <h2>
                  <Link href={`/voices/${article.slug}`}>{article.title}</Link>
                </h2>
                <p className="voices-card-byline">
                  {article.contributorByline?.split(":")[1] ?? "Contributor"} ·{" "}
                  {article.readTime}
                </p>
                <p className="voices-card-summary">{article.summary}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
npm run build
git add src/app/voices/page.tsx
git commit -m "Add /voices index page"
```

---

## Task 12: `/voices/[slug]` individual page

**Files:**
- Create: `src/app/voices/[slug]/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVoiceBySlug } from "@/lib/cms";

type VoicePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: VoicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getVoiceBySlug(slug);
  if (!article) return { title: "Voice" };
  return { title: article.title, description: article.summary };
}

export default async function VoicePage({ params }: VoicePageProps) {
  const { slug } = await params;
  const article = await getVoiceBySlug(slug);
  if (!article) notFound();

  const bylineName = article.contributorByline?.split(":")[1] ?? "Contributor";

  return (
    <div className="page-stack">
      <section className="panel article-shell voices-shell">
        <div className="article-header">
          <div className="article-topline">
            <span className="label-pill">Reader contribution</span>
            <span>{article.topic.name}</span>
            <span>{article.readTime}</span>
          </div>
          <h1>{article.title}</h1>
          <div className="byline-row">
            <p className="byline-name">By {bylineName}</p>
            <p className="byline-date">
              {new Date(article.publishedOn).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <article
          className="article-body voices-body"
          dangerouslySetInnerHTML={{ __html: article.body.replace(/\n/g, "<br/>") }}
        />

        {article.sourceNotes && article.sourceNotes.length > 0 ? (
          <section className="source-notes">
            <p className="eyebrow">Sources cited by the contributor</p>
            <ol className="source-notes-list">
              {article.sourceNotes.map((note, index) => (
                <li key={index}>
                  {note.url ? (
                    <a href={note.url} rel="noreferrer" target="_blank">{note.text}</a>
                  ) : (
                    note.text
                  )}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <footer className="voices-footer">
          This piece reflects the contributor&apos;s views, not the Common Ground newsroom&apos;s reporting.
        </footer>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
npm run build
git add src/app/voices/[slug]/page.tsx
git commit -m "Add /voices/[slug] individual contribution page"
```

---

## Task 13: `/voices/by/[slug]` contributor profile page

**Files:**
- Create: `src/app/voices/by/[slug]/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVoices } from "@/lib/cms";

type ContributorProfileProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ContributorProfileProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug} — Voices contributor` };
}

export default async function ContributorProfile({ params }: ContributorProfileProps) {
  const { slug } = await params;
  const allVoices = await getVoices();

  // The byline is encoded as `<userId>:<username>`. We match on the username segment.
  const matches = allVoices.filter((article) => {
    const username = article.contributorByline?.split(":")[1];
    return username === slug;
  });

  if (matches.length === 0) {
    notFound();
  }

  return (
    <div className="page-stack">
      <section className="panel page-hero">
        <p className="eyebrow">Voices contributor</p>
        <h1>{slug}</h1>
        <p className="page-copy">
          A vetted community contributor publishing on Voices.
        </p>
      </section>

      <section className="page-section">
        <div className="section-heading">
          <p className="eyebrow">Recent pieces</p>
        </div>
        <div className="card-grid card-grid-two">
          {matches.map((article) => (
            <article className="voices-card" key={article.slug}>
              <h2>
                <Link href={`/voices/${article.slug}`}>{article.title}</Link>
              </h2>
              <p className="voices-card-byline">{article.readTime}</p>
              <p className="voices-card-summary">{article.summary}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
npm run build
git add src/app/voices/by/[slug]/page.tsx
git commit -m "Add /voices/by/[slug] contributor profile page"
```

---

## Task 14: Add "Voices" to navigation + topic-page rail

**Files:**
- Modify: `src/content/site.ts`, `src/app/topics/[slug]/page.tsx`

- [ ] **Step 1: Add to nav**

In `src/content/site.ts`, the `navigation` array. Insert a new entry between "Articles" and "Authors":

```ts
{ href: "/voices", label: "Voices" },
```

The full array should now read:

```ts
export const navigation = [
  { href: "/assistant", label: "Assistant" },
  { href: "/articles", label: "Articles" },
  { href: "/voices", label: "Voices" },
  { href: "/authors", label: "Authors" },
  { href: "/topics", label: "Topics" },
  { href: "/about", label: "About" },
  { href: "/standards", label: "Standards" },
  { href: "/corrections", label: "Corrections" },
  { href: "/support", label: "Support" },
];
```

- [ ] **Step 2: Add "From the community" rail to topic pages**

In `src/app/topics/[slug]/page.tsx` (already modified by Spec 1 Phase C to add the podcast sidebar), import `getArticlesByTopic` with the `includeCommunity` flag and add a small community rail.

Add the fetch alongside other topic-page data loads:

```tsx
const communityPieces = (
  await getArticlesByTopic(slug, { includeCommunity: true, preview: isEnabled })
).filter((article) => article.sourceType === "community").slice(0, 3);
```

And render conditionally near (but after) the staff articles grid:

```tsx
{communityPieces.length > 0 ? (
  <section className="page-section">
    <div className="section-heading">
      <p className="eyebrow">From the community</p>
      <h2>Reader essays on this beat</h2>
    </div>
    <div className="card-grid card-grid-two">
      {communityPieces.map((article) => (
        <article className="voices-card" key={article.slug}>
          <p className="card-kicker">Reader contribution</p>
          <h3>
            <Link href={`/voices/${article.slug}`}>{article.title}</Link>
          </h3>
          <p className="voices-card-summary">{article.summary}</p>
        </article>
      ))}
    </div>
  </section>
) : null}
```

- [ ] **Step 3: Build and commit**

```bash
npm run build
git add src/content/site.ts src/app/topics/[slug]/page.tsx
git commit -m "Add Voices to nav and 'From the community' rail to topic pages"
```

---

## Task 15: Add CSS for voices surfaces

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Append styles**

```css
/* ===== Voices ===== */

.voices-form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.voices-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.voices-field > span {
  font-family: var(--font-franklin), -apple-system, "Segoe UI", sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #555;
}

.voices-input,
.voices-textarea {
  padding: 0.55rem 0.7rem;
  border: 1px solid #ddd;
  border-radius: 3px;
  font-family: inherit;
  font-size: 1rem;
  color: #111;
  background: #fff;
}

.voices-body-textarea {
  min-height: 14rem;
  font-family: var(--font-newsreader), Georgia, serif;
  line-height: 1.55;
}

.voices-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.voices-status {
  margin: 0;
  font-size: 0.9rem;
  color: #555;
}

.voices-status-error {
  color: #b34a4a;
}

.voices-critique {
  margin-top: 1rem;
  padding: 1rem 1.25rem;
  background: #fbf9f4;
  border: 1px solid #e8e3d8;
  border-radius: 4px;
}

.voices-critique-body {
  margin: 0.5rem 0 0;
  white-space: pre-wrap;
  font-family: var(--font-newsreader), Georgia, serif;
  font-size: 1rem;
  line-height: 1.55;
  color: #222;
}

.voices-card {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 1.1rem 1.2rem;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 4px;
}

.voices-card h2,
.voices-card h3 {
  margin: 0;
  font-family: var(--font-newsreader), Georgia, serif;
  font-weight: 500;
  font-size: 1.2rem;
  line-height: 1.25;
  color: #111;
}

.voices-card-byline {
  margin: 0;
  font-size: 0.85rem;
  color: #666;
}

.voices-card-summary {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #333;
}

.voices-shell {
  max-width: 56rem;
  margin-left: auto;
  margin-right: auto;
}

.voices-body {
  font-family: var(--font-newsreader), Georgia, serif;
  font-size: 1.08rem;
  line-height: 1.65;
  color: #222;
}

.voices-footer {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(17, 17, 17, 0.18);
  font-style: italic;
  font-size: 0.9rem;
  color: #666;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "Add CSS for voices forms, composer, cards, and article shell"
```

---

## Task 16: Document one-time Strapi setup

**Files:**
- Modify: `docs/google-cloud.md`

- [ ] **Step 1: Append to the Post-Deploy Checklist**

In `docs/google-cloud.md` Section 12, append:

```markdown
11. Create the `Contributor` role in Strapi → Settings → Users & Permissions → Roles → Add new role. Grant: `article.create` only (no update/delete), `article.find` and `findOne` scoped to "own", `contributor-application.create`. Save.
12. Set the public role to `contributor-application.create` (so unauthenticated readers can apply) — actually, applications require auth via session JWT, so leave public denied for `contributor-application`. The route handler enforces auth.
13. After this deploy, contributor applications appear in Strapi → Content Manager → Contributor Application. Review each application, set `status` to `approved`, then manually change the applicant user's role from `Authenticated` to `Contributor` in the users-permissions admin.
```

- [ ] **Step 2: Commit**

```bash
git add docs/google-cloud.md
git commit -m "Document Contributor role setup and application approval workflow"
```

---

## Task 17: End-to-end manual verification

**Files:**
- None modified — verification only.

- [ ] **Step 1: Builds clean**

```bash
npm run build && (cd strapi && npm run build)
```

- [ ] **Step 2: Dev server, no community articles published**

```bash
npm run dev
```

Verify on http://localhost:3000:

- "Voices" appears in the site navigation.
- `/voices` renders: hero + "No community contributions yet — be the first to apply" panel.
- `/voices/apply` renders: form. Without a session cookie, submitting returns 401 (the inline JS shows "Please sign in first via /assistant").
- `/voices/compose` redirects to `/voices/apply` because there's no session cookie.
- `/articles` and `/` are unchanged (no community-pieces leak).

- [ ] **Step 3: Strapi smoke (requires running Strapi + a contributor user)**

If Strapi is running locally and you've:

1. Created the `Contributor` role per Task 16.
2. Created a user, manually upgraded them to `Contributor`.
3. Signed in via `/assistant` so the session cookie is set.

Then:

- Open `/voices/compose`. Composer renders.
- Type a short body (< 100 chars), click "Critique my draft" → 400 response (UI shows error).
- Type 500+ words, click "Critique my draft" → AI critique appears below the form. Re-running replaces it.
- Click "Submit for review" with body < 400 words → button is disabled. Add words until ≥400, click again → submitted state appears. In Strapi admin, a new draft article with `sourceType: 'community'`, `format: 'light'`, `publishedAt: null` exists.
- Set `publishedAt` on the article in Strapi admin and republish. Reload `/voices` — the piece now appears. Reload `/articles` — it does NOT appear (community is excluded). Reload `/` — also excluded.

- [ ] **Step 4: Rate limit smoke**

While dev server is running:

```bash
# 21 critique calls in a row
for i in {1..21}; do
  curl -s -X POST http://localhost:3000/api/voices/critique \
    -b "cg-reader-session=YOUR_REAL_JWT_HERE" \
    -H "Content-Type: application/json" \
    -d '{"title":"Test","body":"A test body that is exactly long enough to pass validation and not too short for the endpoint constraints, padded with extra prose to reach 100 characters comfortably."}' \
    -o /dev/null -w "%{http_code}\n"
done
```

Expected: 20 `200` responses, then one `429` ("daily-limit"). If you don't have a real session JWT, skip this — the first response will be `401`.

- [ ] **Step 5: Git status**

```bash
git status
git log --oneline -20
```

Expected: clean tree, ~16 commits from this plan.

---

## After Spec 3

Voices is live. Reader contributors can:

1. Apply via `/voices/apply`. Editor approves in Strapi.
2. Compose drafts at `/voices/compose` with AI critique help.
3. Submit drafts that appear in Strapi as `light`-format community pieces.
4. See their published work at `/voices/[slug]` and on `/voices/by/[slug]`.

Editors retain full control: review and publish from Strapi admin. Community pieces are structurally separated from staff reporting on `/articles`, `/`, and the Daily Brief.

Known gaps (deferred per Spec 3 §1 and §12):

- No email notifications on application approval, draft submission, or publication.
- No source-fetching/broken-link helper.
- No reader-to-reader interaction.
- No contributor reputation or auto-publish.

These remain open for follow-on iterations once the v1 community rhythm is established.
