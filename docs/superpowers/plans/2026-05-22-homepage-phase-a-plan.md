# Homepage Rebalance (Spec 1, Phase A) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the homepage to dedupe the featured story, render an actual Daily Brief from Strapi, and replace the verbose Editorial Standards section with a compact trust strip — leading with journalism rather than the manifesto.

**Architecture:** Add a new Strapi `daily-brief` content type and a small `deepDive` boolean on the `article` schema. Extend the CMS lib so `getHomepageData` returns mutually-exclusive slots (anchor / deepDive / latest). Rewrite the homepage component's section order top to bottom. Add a small `<TrustStrip>` component and corresponding CSS.

**Tech Stack:** Next.js (App Router, RSC), Strapi 5 (PostgreSQL on Cloud Run in prod, SQLite locally), TypeScript. The frontend lives in the repo root; Strapi lives in `strapi/`.

**Testing posture:** Spec 1 §9 explicitly opts out of an automated test harness. Each task uses **build → manually verify → commit** instead of TDD. Manual verification steps are concrete and copy-pasteable.

**Project-specific gotcha:** The CLAUDE.md / AGENTS.md at the repo root warns that this Next.js version has breaking changes from training data. When in doubt about an API, check `node_modules/next/dist/docs/`. The conventions you'll find here are: server components by default, `force-dynamic` only on routes that need it, draft mode for previews via `next/headers`.

---

## File structure

**Strapi (new files):**

- `strapi/src/components/editorial/brief-item.json` — reusable component for brief slots.
- `strapi/src/api/daily-brief/content-types/daily-brief/schema.json` — content type schema.
- `strapi/src/api/daily-brief/controllers/daily-brief.ts` — auto-generated core controller.
- `strapi/src/api/daily-brief/routes/daily-brief.ts` — auto-generated core router.
- `strapi/src/api/daily-brief/services/daily-brief.ts` — auto-generated core service.

**Strapi (modified):**

- `strapi/src/api/article/content-types/article/schema.json` — add `deepDive` boolean field.

**Frontend (new files):**

- `src/components/trust-strip.tsx` — compact 3-up principle strip.
- `src/components/daily-brief-panel.tsx` — homepage right panel for the Daily Brief.
- `src/components/deep-dive-panel.tsx` — homepage left panel for the deep-dive article.

**Frontend (modified):**

- `src/content/site.ts` — add `BriefItem` and `DailyBrief` types, add `deepDive` to `Article` type, replace `dailyBrief` export with `fallbackDailyBrief`, flag one fallback article with `deepDive: true`.
- `src/lib/cms.ts` — add `getDailyBrief`, `getDeepDiveArticle`, update `getHomepageData` and the article mapper.
- `src/app/page.tsx` — rewrite top-to-bottom for the new section order.
- `src/app/globals.css` — add `.editorial-trust-strip` and `.daily-brief-list` classes (compose with existing patterns).

---

## Task 1: Add the `editorial.brief-item` Strapi component

**Files:**
- Create: `strapi/src/components/editorial/brief-item.json`

- [ ] **Step 1: Create the component file**

```json
{
  "collectionName": "components_editorial_brief_items",
  "info": {
    "displayName": "Brief item",
    "description": "One slot in a daily brief (development, fact-check, or explainer)"
  },
  "attributes": {
    "title": {
      "type": "string",
      "required": true
    },
    "summary": {
      "type": "text",
      "required": true
    },
    "articleLink": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "api::article.article"
    }
  }
}
```

- [ ] **Step 2: Verify Strapi recognises the component**

```bash
cd strapi && npm run build
```

Expected: build succeeds, no schema errors. The file's `displayName` shows up in any subsequent Strapi admin.

- [ ] **Step 3: Commit**

```bash
git add strapi/src/components/editorial/brief-item.json
git commit -m "Add editorial.brief-item Strapi component for daily brief slots"
```

---

## Task 2: Create the `daily-brief` Strapi content type

**Files:**
- Create: `strapi/src/api/daily-brief/content-types/daily-brief/schema.json`
- Create: `strapi/src/api/daily-brief/controllers/daily-brief.ts`
- Create: `strapi/src/api/daily-brief/routes/daily-brief.ts`
- Create: `strapi/src/api/daily-brief/services/daily-brief.ts`

- [ ] **Step 1: Create the schema**

`strapi/src/api/daily-brief/content-types/daily-brief/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "daily_briefs",
  "info": {
    "singularName": "daily-brief",
    "pluralName": "daily-briefs",
    "displayName": "Daily Brief",
    "description": "A low-noise homepage briefing — three developments, one fact-check, one explainer"
  },
  "options": {
    "draftAndPublish": true
  },
  "attributes": {
    "publishedOn": {
      "type": "datetime",
      "required": true
    },
    "headline": {
      "type": "string",
      "required": true
    },
    "developments": {
      "type": "component",
      "repeatable": true,
      "component": "editorial.brief-item",
      "required": true,
      "min": 3,
      "max": 3
    },
    "factCheck": {
      "type": "component",
      "repeatable": false,
      "component": "editorial.brief-item",
      "required": true
    },
    "explainer": {
      "type": "component",
      "repeatable": false,
      "component": "editorial.brief-item",
      "required": true
    }
  }
}
```

- [ ] **Step 2: Create the controller**

`strapi/src/api/daily-brief/controllers/daily-brief.ts` — match the existing topic controller pattern at [strapi/src/api/topic/controllers/topic.ts](strapi/src/api/topic/controllers/topic.ts):

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::daily-brief.daily-brief');
```

- [ ] **Step 3: Create the routes**

`strapi/src/api/daily-brief/routes/daily-brief.ts`:

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::daily-brief.daily-brief');
```

- [ ] **Step 4: Create the service**

`strapi/src/api/daily-brief/services/daily-brief.ts`:

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::daily-brief.daily-brief');
```

- [ ] **Step 5: Build Strapi and verify**

```bash
cd strapi && npm run build
```

Expected: build succeeds. If you have Strapi running locally (`npm run develop` in `strapi/`), the admin now shows a "Daily Brief" content type in Content Manager.

- [ ] **Step 6: Commit**

```bash
git add strapi/src/api/daily-brief/
git commit -m "Add daily-brief Strapi content type with brief-item slots"
```

---

## Task 3: Add `deepDive` boolean to the article schema

**Files:**
- Modify: `strapi/src/api/article/content-types/article/schema.json`

- [ ] **Step 1: Add the field**

In `strapi/src/api/article/content-types/article/schema.json`, after the `featured` attribute (around line 56), add:

```json
    "deepDive": {
      "type": "boolean",
      "default": false,
      "required": true
    },
```

The result inside the `attributes` block should be:

```json
    "featured": {
      "type": "boolean",
      "default": false,
      "required": true
    },
    "deepDive": {
      "type": "boolean",
      "default": false,
      "required": true
    },
    "publishedOn": {
      "type": "datetime",
      "required": true
    },
```

- [ ] **Step 2: Build Strapi**

```bash
cd strapi && npm run build
```

Expected: build succeeds. Strapi will auto-migrate the column on next start (`deepDive` boolean defaulting to `false`, backfilling existing rows).

- [ ] **Step 3: Commit**

```bash
git add strapi/src/api/article/content-types/article/schema.json
git commit -m "Add deepDive boolean to article schema for homepage panel split"
```

---

## Task 4: Update `src/content/site.ts` — types, fallback brief, deepDive flag

**Files:**
- Modify: `src/content/site.ts`

- [ ] **Step 1: Add the `BriefItem` and `DailyBrief` types**

Near the other type exports (after `StoryType` at line 13), add:

```ts
export type BriefItem = {
  title: string;
  summary: string;
  articleSlug?: string;
};

export type DailyBrief = {
  publishedOn: string;
  headline: string;
  developments: BriefItem[];
  factCheck: BriefItem;
  explainer: BriefItem;
};
```

- [ ] **Step 2: Add `deepDive` to the `Article` type**

In the `Article` type (around line 51–64), add `deepDive: boolean;` after `featured: boolean;`:

```ts
export type Article = {
  title: string;
  slug: string;
  summary: string;
  readTime: string;
  storyType: StoryType;
  body: string;
  contentBlocks: ArticleBlock[];
  sources: string[];
  featured: boolean;
  deepDive: boolean;
  publishedOn: string;
  author: Author;
  topic: Topic;
};
```

- [ ] **Step 3: Replace the `dailyBrief` export with `fallbackDailyBrief`**

Remove the existing `dailyBrief` export at lines 104–123. Replace with:

```ts
export const fallbackDailyBrief: DailyBrief = {
  publishedOn: "2026-04-11T08:00:00.000Z",
  headline: "Where public decisions are landing this week.",
  developments: [
    {
      title: "City budget reshapes off-peak transit",
      summary:
        "Council approved the budget last night. The largest service adjustments land outside commuter rush hours, which hits riders with irregular shifts first.",
      articleSlug: "city-budget-transit-schools-renters",
    },
    {
      title: "Utility files new resilience capital plan",
      summary:
        "The plan locks in transformer replacement and outage-duration targets through 2028. Heat-vulnerability funding remains flat.",
      articleSlug: "grid-upgrades-and-heat-risk",
    },
    {
      title: "Regional wage data shows rent-cost divergence",
      summary:
        "Headline wage growth held steady, but renter households in the bottom decile lost ground against essential costs.",
      articleSlug: "paycheck-inflation-gap-households",
    },
  ],
  factCheck: {
    title: "Mayor's claim that 'no service is being cut' — partially supported",
    summary:
      "The budget preserves total service hours but cuts off-peak frequency by roughly 18 percent on three lines, according to the transit planner's own delivery report.",
    articleSlug: "city-budget-transit-schools-renters",
  },
  explainer: {
    title: "What to actually check in a city budget story",
    summary:
      "An evergreen guide to reading line items: where staffing cuts hide, how 'maintained' service can still degrade, and which implementation dates matter.",
    articleSlug: "city-budget-transit-schools-renters",
  },
};
```

- [ ] **Step 4: Flag the grid-upgrades fallback article as deep-dive, set `deepDive: false` on the others**

In the `articles` array, find each article entry and add `deepDive: <boolean>` after the `featured` field.

The four fallback articles get:
- `city-budget-transit-schools-renters` → `deepDive: false` (`featured: true` already; this is the hero anchor)
- `grid-upgrades-and-heat-risk` → `deepDive: true`
- `paycheck-inflation-gap-households` → `deepDive: false`
- `attendance-panic-better-measurement` → `deepDive: false`

For example, the second article entry should now read:

```ts
{
  title: "Why grid upgrades matter more than one week of dramatic weather headlines.",
  slug: "grid-upgrades-and-heat-risk",
  // ... other fields unchanged ...
  featured: false,
  deepDive: true,
  publishedOn: "2026-04-10T14:30:00.000Z",
  // ... rest unchanged ...
},
```

- [ ] **Step 5: TypeScript compile check**

```bash
npm run build
```

Expected: build **fails** with an error in `src/app/page.tsx` because the homepage still imports the removed `dailyBrief` export. The error will look like:

```
Type error: Module '"@/content/site"' has no exported member 'dailyBrief'.
```

This is expected — Task 10 rewrites `page.tsx` to use `dailyBrief` from `getHomepageData` instead. **Proceed to commit anyway.** If the build fails for any *other* reason (e.g., a TypeScript error inside `site.ts` itself, or a missing `BriefItem` field), fix that before committing.

- [ ] **Step 6: Commit**

```bash
git add src/content/site.ts
git commit -m "Add DailyBrief types and fallback content; flag deep-dive article"
```

---

## Task 5: Add `getDailyBrief` to the CMS lib

**Files:**
- Modify: `src/lib/cms.ts`

- [ ] **Step 1: Add a `mapBriefItem` helper**

Near the other map helpers (around `mapArticleBlocks` at line 122), add:

```ts
function mapBriefItem(value: unknown): BriefItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const entry = value as Record<string, unknown>;
  const title = entry.title;
  const summary = entry.summary;
  const articleLinkRaw = entry.articleLink;

  if (typeof title !== "string" || typeof summary !== "string") {
    return null;
  }

  const articleEntity = unwrapRelation(articleLinkRaw);
  const articleSlug =
    articleEntity && typeof articleEntity.slug === "string"
      ? articleEntity.slug
      : undefined;

  return { title, summary, articleSlug };
}

function mapDailyBrief(entity: StrapiEntity): DailyBrief | null {
  const publishedOn = entity.publishedOn;
  const headline = entity.headline;
  const developmentsRaw = entity.developments;
  const factCheckRaw = entity.factCheck;
  const explainerRaw = entity.explainer;

  if (
    typeof publishedOn !== "string" ||
    typeof headline !== "string" ||
    !Array.isArray(developmentsRaw)
  ) {
    return null;
  }

  const developments = developmentsRaw
    .map(mapBriefItem)
    .filter((item): item is BriefItem => Boolean(item));

  const factCheck = mapBriefItem(factCheckRaw);
  const explainer = mapBriefItem(explainerRaw);

  if (developments.length === 0 || !factCheck || !explainer) {
    return null;
  }

  return { publishedOn, headline, developments, factCheck, explainer };
}
```

- [ ] **Step 2: Update the imports at the top of the file**

The existing `import` block at lines 30–35 needs `BriefItem` and `DailyBrief` and `fallbackDailyBrief`:

```ts
import "server-only";
import {
  articles as fallbackArticles,
  authors as fallbackAuthors,
  fallbackDailyBrief,
  topicCards as fallbackTopics,
} from "@/content/site";
import type {
  Article,
  ArticleBlock,
  Author,
  BriefItem,
  DailyBrief,
  Topic,
} from "@/content/site";
```

- [ ] **Step 3: Add the `getDailyBrief` function**

Add this function after `getTopics` (around line 367):

```ts
export async function getDailyBrief(options: QueryOptions = {}): Promise<DailyBrief> {
  const response = await fetchStrapi<StrapiListResponse<StrapiEntity>>(
    `/api/daily-briefs?sort[0]=publishedOn:desc&populate[developments][populate]=articleLink&populate[factCheck][populate]=articleLink&populate[explainer][populate]=articleLink&pagination[limit]=1&status=${options.preview ? "draft" : "published"}`,
    options,
  );

  const first = response?.data?.[0];

  if (!first) {
    return fallbackDailyBrief;
  }

  return mapDailyBrief(first) ?? fallbackDailyBrief;
}
```

- [ ] **Step 4: Build to verify**

```bash
npm run build
```

Expected: build still fails on `src/app/page.tsx` with the same missing-`dailyBrief`-import error from Task 4. Confirm there are no *new* errors pointing at `src/lib/cms.ts` itself. Commit anyway — Task 10 fixes the homepage.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cms.ts
git commit -m "Add getDailyBrief CMS function with brief-item mapping"
```

---

## Task 6: Add `getDeepDiveArticle` and update `getHomepageData`

**Files:**
- Modify: `src/lib/cms.ts`

- [ ] **Step 1: Update `mapArticle` to populate `deepDive`**

In `mapArticle` (lines 259–306), add `deepDive` to the validation and the returned object. Inside the function:

After `const featured = entity.featured;` (around line 269), add:

```ts
const deepDive = entity.deepDive;
```

In the validation block (the big `if` starting around line 273), add a clause:

```ts
(typeof deepDive !== "boolean" && !fallback) ||
```

(Position it next to the `featured` check for readability.)

In the returned object (around lines 290–305), after `featured:`, add:

```ts
deepDive: typeof deepDive === "boolean" ? deepDive : fallback!.deepDive,
```

- [ ] **Step 2: Add `getDeepDiveArticle`**

After `getFeaturedArticle` (around line 333), add:

```ts
export async function getDeepDiveArticle(options: QueryOptions = {}): Promise<Article | null> {
  const allArticles = await getArticles(options);
  return allArticles.find((article) => article.deepDive) ?? null;
}
```

- [ ] **Step 3: Update `getHomepageData`**

Replace the existing `getHomepageData` function (around lines 395–407) with:

```ts
export async function getHomepageData(options: QueryOptions = {}) {
  const [anchorArticle, deepDiveCandidate, topics, dailyBrief, allArticles] = await Promise.all([
    getFeaturedArticle(options),
    getDeepDiveArticle(options),
    getTopics(options),
    getDailyBrief(options),
    getArticles(options),
  ]);

  // Exclusion: if the deep-dive is the same article as the anchor, drop it.
  const deepDiveArticle =
    deepDiveCandidate && anchorArticle && deepDiveCandidate.slug !== anchorArticle.slug
      ? deepDiveCandidate
      : null;

  const excludedSlugs = new Set<string>();
  if (anchorArticle) excludedSlugs.add(anchorArticle.slug);
  if (deepDiveArticle) excludedSlugs.add(deepDiveArticle.slug);

  const latestArticles = allArticles
    .filter((article) => !excludedSlugs.has(article.slug))
    .slice(0, 3);

  return {
    anchorArticle,
    deepDiveArticle,
    dailyBrief,
    latestArticles,
    topics,
  };
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: build still fails on `src/app/page.tsx` with the same `dailyBrief` import error from Task 4. Confirm there are no *new* errors pointing at `src/lib/cms.ts`. Commit anyway.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cms.ts
git commit -m "Add getDeepDiveArticle and exclusion logic to getHomepageData"
```

---

## Task 7: Create the `<TrustStrip>` component

**Files:**
- Create: `src/components/trust-strip.tsx`

- [ ] **Step 1: Write the component**

`src/components/trust-strip.tsx`:

```tsx
import Link from "next/link";
import { editorialPrinciples } from "@/content/site";

export function TrustStrip() {
  return (
    <section className="page-section editorial-trust-strip">
      <ol className="editorial-trust-strip-list">
        {editorialPrinciples.map((principle, index) => (
          <li key={principle.title} className="editorial-trust-strip-item">
            <span className="editorial-trust-strip-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="editorial-trust-strip-title">{principle.title}</h3>
          </li>
        ))}
      </ol>
      <Link className="text-link editorial-trust-strip-link" href="/standards">
        Read the full standards
      </Link>
    </section>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: build still fails on `src/app/page.tsx` with the `dailyBrief` import error from Task 4. Confirm no new errors point at `trust-strip.tsx`. Commit anyway.

- [ ] **Step 3: Commit**

```bash
git add src/components/trust-strip.tsx
git commit -m "Add TrustStrip component for compact homepage editorial signal"
```

---

## Task 8: Create the `<DailyBriefPanel>` component

**Files:**
- Create: `src/components/daily-brief-panel.tsx`

- [ ] **Step 1: Write the component**

`src/components/daily-brief-panel.tsx`:

```tsx
import Link from "next/link";
import type { BriefItem, DailyBrief } from "@/content/site";

function BriefEntry({ item }: { item: BriefItem }) {
  const titleContent = item.articleSlug ? (
    <Link className="daily-brief-item-link" href={`/articles/${item.articleSlug}`}>
      {item.title}
    </Link>
  ) : (
    item.title
  );

  return (
    <li className="daily-brief-item">
      <strong className="daily-brief-item-title">{titleContent}</strong>
      <p className="daily-brief-item-summary">{item.summary}</p>
    </li>
  );
}

export function DailyBriefPanel({ brief }: { brief: DailyBrief }) {
  return (
    <aside className="panel brief-card daily-brief-panel">
      <p className="eyebrow">Daily brief</p>
      <h2>{brief.headline}</h2>

      <p className="daily-brief-section-label">Three developments worth tracking</p>
      <ul className="daily-brief-list">
        {brief.developments.map((item) => (
          <BriefEntry key={item.title} item={item} />
        ))}
      </ul>

      <p className="daily-brief-section-label">One claim checked against evidence</p>
      <ul className="daily-brief-list">
        <BriefEntry item={brief.factCheck} />
      </ul>

      <p className="daily-brief-section-label">One explainer to save for later</p>
      <ul className="daily-brief-list">
        <BriefEntry item={brief.explainer} />
      </ul>
    </aside>
  );
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: build still fails on `src/app/page.tsx` with the `dailyBrief` import error from Task 4. Confirm no new errors point at `daily-brief-panel.tsx`. Commit anyway.

- [ ] **Step 3: Commit**

```bash
git add src/components/daily-brief-panel.tsx
git commit -m "Add DailyBriefPanel rendering the actual Daily Brief content"
```

---

## Task 9: Create the `<DeepDivePanel>` component

**Files:**
- Create: `src/components/deep-dive-panel.tsx`

- [ ] **Step 1: Write the component**

`src/components/deep-dive-panel.tsx`. Note: Phase B will add an executive-summary preview to this panel. For Phase A it shows the same content shape as the current Featured Reporting panel — just bound to `deepDiveArticle` instead of `featuredArticle`.

```tsx
import Link from "next/link";
import type { Article } from "@/content/site";

export function DeepDivePanel({ article }: { article: Article }) {
  return (
    <article className="panel story-feature deep-dive-panel">
      <p className="eyebrow">Deep dive</p>
      <div className="story-meta">
        <span>{article.topic.name}</span>
        <span>{article.readTime}</span>
      </div>
      <h2>{article.title}</h2>
      <p>{article.summary}</p>
      <ul className="source-list">
        {article.sources.map((source) => (
          <li key={source}>{source}</li>
        ))}
      </ul>
      <Link className="button-secondary" href={`/articles/${article.slug}`}>
        Read the full article
      </Link>
    </article>
  );
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: build still fails on `src/app/page.tsx` with the `dailyBrief` import error from Task 4. Confirm no new errors point at `deep-dive-panel.tsx`. Commit anyway.

- [ ] **Step 3: Commit**

```bash
git add src/components/deep-dive-panel.tsx
git commit -m "Add DeepDivePanel for the homepage deep-dive slot"
```

---

## Task 10: Rewrite `src/app/page.tsx` for the new section order

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of [src/app/page.tsx](src/app/page.tsx) with:

```tsx
import Link from "next/link";
import { draftMode } from "next/headers";
import { supportReasons, trustSignals } from "@/content/site";
import { ArticleCard } from "@/components/article-card";
import { TrustStrip } from "@/components/trust-strip";
import { DailyBriefPanel } from "@/components/daily-brief-panel";
import { DeepDivePanel } from "@/components/deep-dive-panel";
import { getHomepageData } from "@/lib/cms";

export default async function Home() {
  const { isEnabled } = await draftMode();
  const { anchorArticle, deepDiveArticle, dailyBrief, latestArticles, topics } =
    await getHomepageData({ preview: isEnabled });

  return (
    <div className="page-stack">
      {/* 1. Hero with anchor article */}
      <section className="hero-grid panel panel-hero">
        <div className="space-y-6">
          <p className="eyebrow">Advertisement-free reporting for public life</p>
          <h1 className="hero-title">
            A calmer news portal built for clarity, verification, and context.
          </h1>
          <p className="hero-copy">
            Common Ground is designed around public-interest journalism rather
            than attention spikes. Each piece is source-linked, clearly labeled,
            and edited to explain what matters without sensational framing.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link className="button-primary" href="/assistant">
              Open your news assistant
            </Link>
            <Link className="button-primary" href="/standards">
              Read our standards
            </Link>
            <Link className="button-secondary" href="/support">
              Support the newsroom
            </Link>
          </div>
        </div>
        <div className="hero-card">
          <div className="hero-card-band">Today&apos;s editorial focus</div>
          <h2>{anchorArticle?.title ?? "CMS article feed is not configured yet."}</h2>
          <p>
            {anchorArticle?.summary ??
              "Set NEXT_PUBLIC_STRAPI_URL and STRAPI_API_TOKEN to load live articles from Strapi. Until then, the portal uses its local editorial fallback."}
          </p>
          <dl className="hero-stats">
            {trustSignals.map((signal) => (
              <div key={signal.label}>
                <dt>{signal.label}</dt>
                <dd>{signal.value}</dd>
              </div>
            ))}
          </dl>
          {anchorArticle ? (
            <Link className="text-link hero-card-link" href={`/articles/${anchorArticle.slug}`}>
              Open featured story
            </Link>
          ) : null}
        </div>
      </section>

      {/* 2. Deep dive + Daily Brief */}
      <section className={`page-section ${deepDiveArticle ? "feature-layout" : ""}`}>
        {deepDiveArticle ? <DeepDivePanel article={deepDiveArticle} /> : null}
        <DailyBriefPanel brief={dailyBrief} />
      </section>

      {/* 3. Latest articles */}
      <section className="page-section">
        <div className="section-heading section-heading-row">
          <div>
            <p className="eyebrow">Latest articles</p>
            <h2>Structured around article types, bylines, and clear sourcing.</h2>
          </div>
          <Link className="text-link" href="/articles">
            Browse all articles
          </Link>
        </div>
        <div className="card-grid card-grid-three">
          {latestArticles.map((article) => (
            <ArticleCard article={article} key={article.slug} />
          ))}
        </div>
      </section>

      {/* 4. Topic beats */}
      <section className="page-section">
        <div className="section-heading section-heading-row">
          <div>
            <p className="eyebrow">Coverage areas</p>
            <h2>Follow durable beats and high-interest topics without outrage cues.</h2>
          </div>
          <Link className="text-link" href="/topics">
            See all topics
          </Link>
        </div>
        <div className="card-grid card-grid-two">
          {topics.map((topic) => (
            <Link className="panel topic-card" href={`/topics/${topic.slug}`} key={topic.slug}>
              <div>
                <p className="card-kicker">{topic.kicker}</p>
                <h3>{topic.name}</h3>
              </div>
              <p>{topic.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. Trust strip */}
      <TrustStrip />

      {/* 6. Assistant callout */}
      <section className="page-section">
        <article className="panel assistant-callout">
          <div>
            <p className="eyebrow">Personalized briefing</p>
            <h2>A newsroom chatbot for trending topics without engagement bait.</h2>
            <p>
              Readers can save topics, preferred article types, reading-time limits,
              sourcing thresholds, and blocked keywords, then ask for a tailored briefing on
              both core desks and widely reported live topics.
            </p>
          </div>
          <Link className="button-secondary" href="/assistant">
            Try the assistant
          </Link>
        </article>
      </section>

      {/* 7. Support panel */}
      <section className="page-section panel support-panel">
        <div className="section-heading">
          <p className="eyebrow">Reader support</p>
          <h2>Revenue should reinforce editorial independence, not distort it.</h2>
        </div>
        <div className="card-grid card-grid-three compact-grid">
          {supportReasons.map((reason) => (
            <article className="support-reason" key={reason.title}>
              <h3>{reason.title}</h3>
              <p>{reason.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: build succeeds with no errors. If any error remains, the most likely culprit is a missing import or a typo in the panel components from Tasks 7–9.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "Restructure homepage: journalism-first order with deep-dive and rendered brief"
```

---

## Task 11: Add CSS for the new components

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Append the trust-strip styles**

At the end of `src/app/globals.css`, add:

```css
/* ===== Trust strip (replaces verbose Editorial Standards) ===== */

.editorial-trust-strip {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-top: 2.5rem;
  padding-bottom: 0;
  border-top: 1px solid rgba(17, 17, 17, 0.22);
}

.editorial-trust-strip-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.editorial-trust-strip-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.editorial-trust-strip-number {
  font-family: var(--font-newsreader), Georgia, serif;
  font-size: 0.95rem;
  font-style: italic;
  color: #888;
  letter-spacing: 0.04em;
}

.editorial-trust-strip-title {
  margin: 0;
  font-family: var(--font-newsreader), Georgia, "Times New Roman", serif;
  font-weight: 500;
  font-size: 1.1rem;
  line-height: 1.25;
  color: #111;
}

.editorial-trust-strip-link {
  align-self: flex-start;
  margin-top: 0.25rem;
}

@media (max-width: 700px) {
  .editorial-trust-strip-list {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}
```

- [ ] **Step 2: Append the daily-brief panel styles**

Also at the end of `src/app/globals.css`:

```css
/* ===== Daily brief panel (homepage right column) ===== */

.daily-brief-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.daily-brief-section-label {
  margin: 0.75rem 0 0;
  font-family: var(--font-franklin), -apple-system, "Segoe UI", sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #555;
}

.daily-brief-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.daily-brief-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.daily-brief-item-title {
  font-weight: 600;
  color: #111;
}

.daily-brief-item-link {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: rgba(17, 17, 17, 0.25);
  text-underline-offset: 3px;
}

.daily-brief-item-link:hover {
  text-decoration-color: rgba(17, 17, 17, 0.6);
}

.daily-brief-item-summary {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #333;
}

/* ===== Deep dive panel (homepage left column when present) ===== */

.deep-dive-panel {
  /* inherits .panel and .story-feature; this hook is for future Phase B additions */
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: build succeeds. CSS is not type-checked by Next.js; this just confirms nothing in the JS/TS broke.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "Add CSS for trust strip and daily brief panel"
```

---

## Task 12: End-to-end manual verification

**Files:**
- None modified — verification only.

- [ ] **Step 1: Verify both builds succeed clean**

```bash
npm run build && (cd strapi && npm run build)
```

Expected: both succeed with no warnings about the changed files. If `next build` shows a warning about a duplicate Strapi route or missing component, debug before continuing.

- [ ] **Step 2: Run the frontend dev server (no Strapi)**

```bash
npm run dev
```

Open http://localhost:3000 in a browser. Verify:

- Hero shows the "city budget" anchor article (kicker / title / summary).
- Below the hero: two-column layout. Left = "Deep dive" panel with "Why grid upgrades matter…" Right = "Daily brief" panel with three developments, one fact-check, one explainer, each as actual content (not a meta-description).
- Latest articles section (3 cards) shows the **paycheck-inflation gap** and **attendance panic** articles. **City budget and grid-upgrades articles are NOT in the latest grid** (they're the anchor and deep-dive).
- Topic beats grid follows.
- Trust strip (3 compact numbered principles + "Read the full standards" link) replaces the old Editorial Standards block.
- Assistant callout and Reader support sections still render at the bottom.

If any of these are wrong, stop and fix before moving on. Common issues:

- "Deep dive" panel missing → confirm `grid-upgrades-and-heat-risk` has `deepDive: true` in `src/content/site.ts`.
- "Daily brief" still shows the old meta-text → confirm the `dailyBrief` import was renamed to `fallbackDailyBrief` everywhere and the homepage uses `dailyBrief` from `getHomepageData`.
- City budget article visible in Latest → confirm `getHomepageData`'s exclusion set includes both `anchorArticle.slug` and `deepDiveArticle.slug`.

- [ ] **Step 3: Run the frontend with Strapi configured (optional, if available)**

If you have a local Strapi running:

```bash
cd strapi && npm run develop
```

In the Strapi admin (http://localhost:1337/admin):

1. Open Content Manager → Daily Brief → Create new entry. Fill in `publishedOn` = today, `headline` = "Local test brief", add 3 developments + 1 fact-check + 1 explainer (any text). Save and Publish.
2. Open Content Manager → Article → pick the "grid-upgrades" article. Set `deepDive` = true. Save and Publish.
3. Reload http://localhost:3000. The homepage should now show the Strapi-published brief instead of the fallback, and the Strapi-flagged deep-dive instead of the local fallback.

If Strapi is not available locally, skip this step. The fallback flow tested in Step 2 covers most of the surface.

- [ ] **Step 4: Final git status check**

```bash
git status
git log --oneline -15
```

Expected:

- Working tree clean.
- Last 11 commits roughly: "Add editorial.brief-item Strapi component" → "Add daily-brief Strapi content type" → "Add deepDive boolean to article schema" → "Add DailyBrief types and fallback content" → "Add getDailyBrief CMS function" → "Add getDeepDiveArticle and exclusion logic" → "Add TrustStrip component" → "Add DailyBriefPanel" → "Add DeepDivePanel" → "Restructure homepage" → "Add CSS for trust strip and daily brief panel".

- [ ] **Step 5: No final commit needed**

All work was committed task-by-task. Phase A is complete. The codebase is in a state where it can ship to production behind no feature flag — Phase A is the user-visible homepage rebalance the brand needs first.

---

## After Phase A

Phase B (McKinsey article structure + OG images + clarity feedback) is the next plan. It depends on the schema additions from this phase being in place. The `<DeepDivePanel>` and hero card created here will be extended in Phase B with executive-summary previews and lead-exhibit thumbnails — but those changes are additive and won't disrupt Phase A's user-visible behavior.

The Phase A plan is intentionally narrow: it ships the highest-leverage critique fix (journalism-first homepage with dedupe and a real brief) before taking on the bigger article rendering work.
