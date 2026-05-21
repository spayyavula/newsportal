# Design: Homepage rebalance, McKinsey-style articles, soft sections

**Date:** 2026-05-22
**Status:** Draft — awaiting review
**Driver:** Claude.ai review of sanenews.net surfaced three problems (manifesto-heavy homepage, duplicated featured story, daily brief that describes itself instead of showing itself). User then expanded scope to redesign articles in a data-led McKinsey style, add a Music and Arts category as a calmer counter-weight, and curate external podcasts.

---

## 1. Scope

In scope:

- Homepage rebalance: dedupe the featured story, reduce the editorial-standards block to a compact trust strip, render an actual Daily Brief, reorder sections to lead with journalism.
- Mandatory McKinsey-style article structure (executive summary, lead exhibit, source notes) for the default `data-led` format.
- Structured chart rendering via Observable Plot.
- Dynamic Open Graph images for `/`, `/articles/[slug]`, `/topics/[slug]`, `/authors/[slug]`.
- New `music-arts` topic with curatorial/appreciative framing.
- New `format` field on articles (`'data-led' | 'light'`) that exempts `light` articles from mandatory McKinsey fields.
- New curated `podcast-recommendation` content type, surfaced on topic pages and optionally inside the Daily Brief.

Out of scope (deliberate — do not creep in):

- Stale-content investigation, last-updated indicator, Strapi authoring workflow improvements.
- Assistant filter-bubble reframe.
- Automatic exhibit numbering, per-exhibit color overrides, dark-mode chart variants, lazy-loaded inline exhibits.
- In-site podcast playback, multiple platform links per podcast, transcripts.
- Standalone `/listen` page.
- New automated test harness (project has none today).

---

## 2. Architecture

Three layers change. No cross-layer leaks beyond what already exists.

1. **Strapi (CMS)** — three new content types (`daily-brief`, `chart-exhibit`, `podcast-recommendation`); one new topic seed (`music-arts`); three new editorial components (`brief-item`, `summary-bullet`, `source-note`); article schema additions (`executiveSummary`, `leadExhibit`, `sourceNotes`, `deepDive`, `format`).
2. **CMS lib (server-only)** — `getDailyBrief`, `getDeepDiveArticle`, `getChartExhibit`, `getPodcastRecommendationsByTopic`. `getHomepageData` updated so the same article never appears in two slots.
3. **Frontend components (React Server Components)** — homepage restructured; new `<ExecutiveSummary>`, `<Exhibit>`, `<SourceNotes>`, `<PodcastRecommendation>`, `<OgCard>`, `<TrustStrip>` components; `<ArticleCard>` gains an optional thumbnail.

Resilience principle, preserved from existing code: every Strapi-backed data source has a hard-coded fallback in [src/content/site.ts](src/content/site.ts). If Strapi is down or unconfigured, the homepage and article pages render entirely from local data with the full new layout exercised.

---

## 3. Strapi changes

### 3.1 New content type: `daily-brief`

Location: `strapi/src/api/daily-brief/`.

| Field | Type | Constraints |
|---|---|---|
| `publishedOn` | datetime | Required. Sort desc; homepage uses newest. |
| `headline` | string | Required. Replaces the current meta-copy "A low-noise briefing…" |
| `developments` | repeatable component `editorial.brief-item` | Required. Exactly 3 items. |
| `factCheck` | single component `editorial.brief-item` | Required. |
| `explainer` | single component `editorial.brief-item` | Required. |
| `recommendedListen` | relation to `podcast-recommendation` | Optional. When set, homepage renders a 4th brief block. |

Standard auto-generated CRUD routes/controllers. No custom logic.

### 3.2 New content type: `chart-exhibit`

Location: `strapi/src/api/chart-exhibit/`.

| Field | Type | Constraints |
|---|---|---|
| `figureNumber` | integer | Required. Manual in v1 (automatic numbering deferred). |
| `title` | string | Required. e.g., "Rent burden by income decile, 2024". |
| `chartType` | enum | Required. `line` \| `bar` \| `area` \| `dot` \| `stackedBar`. v1 ships these 5. |
| `series` | json | Required. Array of `{ name: string, data: { x: number\|string, y: number }[] }`. |
| `xAxisLabel` | string | Optional. |
| `yAxisLabel` | string | Optional. |
| `sourceNote` | string | Required. Single line citing data origin. |

Standalone so charts can be referenced from articles (and later from the daily-brief) without duplication. A `beforeCreate`/`beforeUpdate` lifecycle hook validates the `series` JSON shape; bad shape returns 400 with a readable error.

### 3.3 New content type: `podcast-recommendation`

Location: `strapi/src/api/podcast-recommendation/`.

| Field | Type | Constraints |
|---|---|---|
| `showName` | string | Required. e.g., "99% Invisible". |
| `episodeTitle` | string | Required. |
| `host` | string | Optional. |
| `durationMinutes` | integer | Required. Drives the "27 min listen" callout. |
| `summary` | text | Required. 1–3 sentence editorial blurb. |
| `listenUrl` | string | Required. External URL. |
| `topic` | relation to `topic` | Required. One topic per recommendation in v1. |
| `publishedOn` | datetime | Required. Sort desc for "most recent". |

### 3.4 New editorial components

Location: `strapi/src/components/editorial/`.

- **`brief-item.json`** — `title: string`, `summary: text`, `articleLink: relation to article (optional)`.
- **`summary-bullet.json`** — `text: string`.
- **`source-note.json`** — `text: string`, `url: string (optional)`.

### 3.5 `article` schema changes

Additive only. Existing fields are preserved.

| New field | Type | Constraints |
|---|---|---|
| `executiveSummary` | repeatable component `editorial.summary-bullet` | Required when `format === 'data-led'`; 3–5 items. |
| `leadExhibit` | relation to `chart-exhibit` | Required when `format === 'data-led'`. |
| `sourceNotes` | repeatable component `editorial.source-note` | Required when `format === 'data-led'`; ≥1 item. |
| `deepDive` | boolean | Default `false`. Drives the Featured Reporting panel slot. |
| `format` | enum | `data-led` \| `light`. Default `data-led`. |

`contentBlocks` gains one new component option `editorial.exhibit-reference` (relation to `chart-exhibit`) so authors can place additional exhibits inline within the body.

Note that the "Required when…" cells above describe the *intended* editorial contract. In v1 the Strapi schema marks these fields optional and we enforce only at the TypeScript/runtime layer (see Section 3.6).

### 3.6 Migration approach (soft enforcement)

The new required fields are *typed* required in TypeScript but **not** enforced in Strapi validation in v1. Reason: enforcing now would break any published article that doesn't have them. Soft enforcement lets editors backfill content gradually; we tighten the validation once the corpus is migrated. Document this caveat inline in `article/schema.json` and call it out in the engineering notes.

### 3.7 Music and Arts topic seed

One new entry in the `topic` content type (manually added by an editor in Strapi after this work ships) and mirrored in the local fallback `topicCards`:

```ts
{
  slug: "music-arts",
  name: "Music and Arts",
  kicker: "A quieter corner",
  description:
    "Music, instrumental pieces, and gentle arts writing for readers who want a soft break from the news cycle.",
  landingIntro:
    "A small, calmer desk — listening recommendations, melodic discoveries, and quiet pieces about hobby music and art that readers can return to between heavier stories.",
  editorialFocus:
    "Pieces here are appreciative and curatorial rather than investigative. They aim for soothing context and discovery, not policy or accountability framing.",
  keyQuestions: [
    "What is this piece, and why might a reader want to spend time with it?",
    "What does it sound or feel like in plain language?",
    "Where can the reader find it?",
  ],
  coverageFocus: [
    "Listening recommendations",
    "Hobby and amateur music",
    "Quiet writing on small artworks",
  ],
  cadence: "One or two pieces per week",
}
```

---

## 4. CMS lib changes

[src/lib/cms.ts](src/lib/cms.ts) gains four new functions, all following the existing Strapi-fetch → map → fallback pattern. [src/content/site.ts](src/content/site.ts) grows new type exports and fallback constants.

### 4.1 New types in `site.ts`

```ts
export type ArticleFormat = "data-led" | "light";

export type ChartType = "line" | "bar" | "area" | "dot" | "stackedBar";

export type ChartSeriesPoint = { x: number | string; y: number };
export type ChartSeries = { name: string; data: ChartSeriesPoint[] };

export type ChartExhibit = {
  figureNumber: number;
  title: string;
  chartType: ChartType;
  series: ChartSeries[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  sourceNote: string;
};

export type ExecutiveSummary = string[]; // 3–5 bullets
export type SourceNote = { text: string; url?: string };

export type BriefItem = {
  title: string;
  summary: string;
  articleSlug?: string; // when set, item links to /articles/<slug>
};

export type DailyBrief = {
  publishedOn: string;
  headline: string;
  developments: BriefItem[]; // exactly 3
  factCheck: BriefItem;
  explainer: BriefItem;
  recommendedListen?: PodcastRecommendation;
};

export type PodcastRecommendation = {
  showName: string;
  episodeTitle: string;
  host?: string;
  durationMinutes: number;
  summary: string;
  listenUrl: string;
  topicSlug: string;
  publishedOn: string;
};

// New ArticleBlock variant. CMS mapping resolves the Strapi relation
// (chart-exhibit id) into the full ChartExhibit at fetch time so render
// code never needs to do a secondary lookup.
export type ArticleExhibitReferenceBlock = {
  type: "exhibit-reference";
  exhibit: ChartExhibit;
};
// added to the ArticleBlock union
```

`Article` type gains:

```ts
executiveSummary?: ExecutiveSummary;
leadExhibit?: ChartExhibit;
sourceNotes?: SourceNote[];
deepDive: boolean;
format: ArticleFormat;
```

(`?` markers reflect the soft-enforcement migration. TypeScript treats them as optional; runtime rendering treats `data-led` articles without these fields as a degraded state — see Section 6.)

### 4.2 Fallback content updates in `site.ts`

- `fallbackDailyBrief: DailyBrief` replaces the existing `dailyBrief` meta-copy. Three real `developments` tied to existing fallback articles by `articleSlug`, plus a `factCheck` and `explainer`.
- 4 fallback articles all gain `executiveSummary`, `leadExhibit`, `sourceNotes`. Charts cover four of five chart types (`line`, `bar`, `area`, `dot`) so renderers are exercised in dev. One article gets `deepDive: true` (`grid-upgrades-and-heat-risk`, the analysis piece).
- New `fallbackPodcastRecommendations: PodcastRecommendation[]` — 2–3 entries tied to the existing fallback topics.
- `topicCards` gains the `music-arts` entry.
- `dailyBrief` (existing export) is removed; replaced by `fallbackDailyBrief`. The old shape has no consumers besides the homepage.

### 4.3 New CMS lib functions

```ts
getDailyBrief(options?): Promise<DailyBrief>
getDeepDiveArticle(options?): Promise<Article | null>
getChartExhibit(figureNumber: number, options?): Promise<ChartExhibit | null>
getPodcastRecommendationsByTopic(slug: string, limit?: number, options?): Promise<PodcastRecommendation[]>
```

All fall back to local data when Strapi returns nothing.

### 4.4 Updated `getHomepageData`

```ts
{
  anchorArticle: Article;        // hero featured
  deepDiveArticle: Article | null; // different deepDive=true article, or null
  dailyBrief: DailyBrief;
  latestArticles: Article[];     // up to 3, excluding anchor + deep-dive
  topics: Topic[];
}
```

Exclusion logic lives inside this function. If `getDeepDiveArticle()` returns the same slug as the anchor, `deepDiveArticle` is set to `null` and the deep-dive panel is omitted rather than duplicated.

---

## 5. Homepage restructure

[src/app/page.tsx](src/app/page.tsx) is rewritten section-by-section. Stays a single file (~180 lines).

New flow, top to bottom:

1. **Hero** — value prop, CTAs (`/assistant`, `/standards`, `/support`), anchor article card. The hero card gains a compact lead-exhibit thumbnail (120px tall, no axes, no source note) beneath the summary when `anchorArticle.leadExhibit` is present. Omitted gracefully when absent.
2. **Featured deep-dive + Daily Brief** (2-column `feature-layout`). Left: `<DeepDivePanel>` renders `deepDiveArticle` with its first 2 executive-summary bullets ("…and N more findings" truncation), sources teaser, "Read the full article" CTA. Right: `<DailyBriefPanel>` renders the actual brief — `headline`, three developments (linked when `articleSlug` set), fact-check, explainer, and the optional `recommendedListen` block when present. If `deepDiveArticle` is null, the brief panel spans full width.
3. **Latest articles** — `card-grid card-grid-three`, three `<ArticleCard>`s. `latestArticles` is already exclusive of anchor and deep-dive. `<ArticleCard>` gains an 80px lead-exhibit thumbnail (Section 6.6), omitted gracefully when missing.
4. **Topic beats** — unchanged.
5. **Editorial Standards trust strip** — replaces the current 3-card section. New compact 3-up: numbered 01/02/03, principle *titles only*, no body copy, single row on desktop and stacked on mobile. Links to `/standards` for the full argument. New CSS class `editorial-trust-strip` so the standards page keeps the full version.
6. **Assistant callout** — unchanged.
7. **Reader support** — unchanged.

The existing "Editorial Standards" section at [page.tsx:66-85](src/app/page.tsx#L66-L85) is removed; the new trust strip takes its place at step 5.

---

## 6. Article rendering changes

Two files change. New components live under [src/components/](src/components/).

### 6.1 New `<ExecutiveSummary>` component

Panel with `eyebrow` "Key findings", then 3–5 bulleted items rendered as a styled list. Visually distinct from body prose — bordered, slightly recessed background. Pure presentational component; no logic.

### 6.2 New `<Exhibit>` component

Single component reused for the lead exhibit, inline exhibits, and homepage thumbnails. Props:

```ts
type ExhibitProps = {
  exhibit: ChartExhibit;
  variant?: "default" | "compact"; // compact = no axis labels, no source note
  className?: string;
};
```

Renders an Observable Plot SVG inside a `<figure>` with caption (`Exhibit N. Title`) and source note. Compact variant omits caption and source note and shrinks to thumbnail size. Each exhibit includes an SVG `<title>` element, `role="img"`, and an `aria-label` derived from `title + sourceNote` for accessibility.

### 6.3 New `<SourceNotes>` component

End-of-article numbered list of `SourceNote`. Hyperlinks when `url` is provided. Sits beneath the article body.

### 6.4 New `src/lib/exhibits.ts` (chart rendering)

Wraps Observable Plot calls into typed renderers — one per `chartType`. Each takes the validated `series` JSON plus axis labels and returns an SVG string. Server-rendered by default (article and topic pages are server-rendered).

Single `chartTheme` constant centralises typography and color. Values read from the existing site CSS variables on the server (or hard-coded constants mirroring them — Observable Plot needs literal values, not CSS variable references):

```ts
const chartTheme = {
  fontFamily: "var(--font-serif)",        // mirror the serif used elsewhere
  fontSize: 12,
  axisColor: "#888",                      // mirrors --color-rule
  textColor: "#222",
  seriesPalette: ["#c4a662", "#2f2f2f"],  // accent + dark neutral
  gridLineColor: "#e8e3d8",
};
```

No per-exhibit color overrides in v1. All charts inherit the theme.

### 6.5 [src/app/articles/[slug]/page.tsx](src/app/articles/[slug]/page.tsx) restructure

New top-to-bottom structure for `data-led` articles:

1. **Article header** — kicker (topic), title, byline, read time, storyType label. Unchanged.
2. **`<ExecutiveSummary bullets={article.executiveSummary} />`** — only when `format === 'data-led'` and present.
3. **`<Exhibit exhibit={article.leadExhibit} />`** — only when `format === 'data-led'` and present.
4. **Article body** — existing prose + `contentBlocks` rendering. The new `exhibit-reference` block type renders an additional `<Exhibit>` inline. `<ArticleContentBlocks>` at [src/components/article-content-blocks.tsx](src/components/article-content-blocks.tsx) gains one new switch case.
5. **`<SourceNotes notes={article.sourceNotes} />`** — only when `format === 'data-led'` and present.

For `format === 'light'` articles, sections 2/3/5 are omitted entirely. The article is just header + body. Music/arts articles render this way by default.

Soft-enforcement degradation: if `format === 'data-led'` but the required fields are missing on a given article, that section is omitted silently. No error, no broken layout — matches the existing fallback discipline.

### 6.6 `<ArticleCard>` update at [src/components/article-card.tsx](src/components/article-card.tsx)

Optional compact lead-exhibit thumbnail (80px tall, monochrome, no axes/source) above the existing card content. Omitted when `article.leadExhibit` is missing or `article.format === 'light'`.

### 6.7 New `<PodcastRecommendation>` component

Compact card for the topic page sidebar and the Daily Brief audio slot. Shows `showName`, `episodeTitle`, optional `host`, `durationMinutes` (e.g., "27 min listen"), 1-line summary, and a single external-link button labelled "Listen". Opens `listenUrl` in a new tab with `rel="noopener noreferrer"`.

### 6.8 Topic page sidebar at [src/app/topics/[slug]/page.tsx](src/app/topics/[slug]/page.tsx)

Adds a new sidebar/section "Recommended listening" showing up to 3 of the most recent `PodcastRecommendation` entries for that topic. Section omitted when no recommendations exist (no awkward empty card).

### 6.9 New `<TrustStrip>` component

Replaces the verbose Editorial Standards block on the homepage. Renders the three `editorialPrinciples` titles as a compact horizontal strip with `01` / `02` / `03` numbering, a single "Read the full standards" text link, and the `editorial-trust-strip` CSS class. Body copy of each principle is intentionally dropped — the goal is signal, not argument. No props; the principles are imported directly from [src/content/site.ts](src/content/site.ts). Pure presentational component.

---

## 7. Dynamic Open Graph images

Next.js convention: an `opengraph-image.tsx` file alongside a route automatically wires up the route's `metadata.openGraph.images`.

### 7.1 Shared template

New component `src/components/og-card.tsx`. JSX renders inside Next.js's Satori-backed image generator. Single template, multiple props:

```ts
type OgCardProps = {
  kicker?: string;     // topic name, "Author", etc.
  title: string;       // the headline
  subtitle?: string;   // byline, topic description, etc.
  brand: "Common Ground"; // always
};
```

1200×630 px. Site typography (loaded via `@vercel/og`'s font option or Satori's `fonts` array). Pure layout — no chart rendering inside OG, so no Plot-to-Satori conversion needed.

### 7.2 Routes that ship `opengraph-image.tsx`

| Route | `kicker` | `title` | `subtitle` |
|---|---|---|---|
| `/` | — | "Common Ground" | tagline |
| `/articles/[slug]` | topic name | article title | byline |
| `/topics/[slug]` | "Topic" | topic name | topic description |
| `/authors/[slug]` | "Author" | author name | author role |

Each route's `page.tsx` adds `metadata.openGraph.title` and `metadata.openGraph.description` so social previews are complete even where the platform shows text alongside the image.

---

## 8. Fallback content for local rendering

[src/content/site.ts](src/content/site.ts) grows to exercise the full new layout without Strapi. Required updates:

1. 4 existing fallback articles gain `executiveSummary` (3–5 bullets each), `leadExhibit` (one `ChartExhibit` each — covering line, bar, area, dot chart types across the four), `sourceNotes` (2–4 entries each), `format: "data-led"`, and one (`grid-upgrades-and-heat-risk`) gets `deepDive: true`. The fifth chart type, `stackedBar`, is not exercised by fallback content — the first CMS-published exhibit using it should be visually verified manually since dev has no automatic coverage.
2. New `fallbackDailyBrief: DailyBrief` with three `developments` linked to existing fallback articles via `articleSlug`, one `factCheck`, one `explainer`. Optionally one `recommendedListen` to exercise the new homepage slot.
3. New `fallbackPodcastRecommendations: PodcastRecommendation[]` — 3 entries tied to civic-life, climate-science, and music-arts topics.
4. New `music-arts` entry in `topicCards`.
5. The legacy `dailyBrief` export is removed.

This is grunt work but mandatory: it's how the homepage renders correctly with no Strapi configured (the current default for local dev).

---

## 9. Testing

No new automated test harness — the project doesn't have one today. Manual verification gates:

1. `npm run build` and `npm run cms:build` both succeed.
2. Local dev (no Strapi): homepage renders the full new flow from fallback. Hero shows thumbnail. Deep-dive panel shows exec-summary preview. Daily Brief renders three developments + fact-check + explainer. Latest grid shows thumbnails. Trust strip is at the bottom. No duplicate article anywhere.
3. Local dev (Strapi configured): publish one `daily-brief`, one `chart-exhibit`, one `podcast-recommendation`, and one `data-led` article with all McKinsey fields → all surfaces use CMS data. Then publish one `light` article in the `music-arts` topic → article page renders without exec-summary or lead exhibit. Then publish a podcast recommendation for that topic → topic page sidebar shows it.
4. Article page renders an Observable Plot SVG that respects site typography. Inline `exhibit-reference` block renders an inline exhibit.
5. OG smoke test: hit `/opengraph-image`, `/articles/<slug>/opengraph-image`, `/topics/<slug>/opengraph-image`, `/authors/<slug>/opengraph-image` directly. Each returns a 1200×630 PNG.

---

## 10. Risks and open trade-offs

- **Soft enforcement** of mandatory McKinsey fields means a published article without exec-summary or lead-exhibit will render as a partial page rather than fail. Acceptable because validation cliff would be worse. Editorial discipline tightens once corpus is migrated.
- **Observable Plot bundle size** (~55KB gzipped) is added to articles. Acceptable for a journalism site; lazy-loading per-route is possible if it becomes a problem.
- **OG images** use Next.js's edge runtime under the hood; fonts must be embedded. One-time integration cost.
- **Bigger spec than a single sitting of work** — see Section 11 for staging guidance.

---

## 11. Suggested implementation phasing

The spec is one design but the work splits naturally into three phases. Each phase can ship independently and is internally coherent.

- **Phase A — Homepage rebalance.** Sections 3.1, 3.4 (`brief-item` only), 4 (`getDailyBrief`, updated `getHomepageData`), 5, 8 (fallback `dailyBrief` only). Ships the journalism-first homepage, dedupe, and rendered Daily Brief. No McKinsey, no podcasts.
- **Phase B — McKinsey article structure.** Sections 3.2, 3.4 (`summary-bullet`, `source-note`), 3.5, 3.6, 4.1–4.3 (article-related), 6.1–6.6, 7, 8 (article-related fallback). Ships the data-led article treatment, exhibits, OG images, and homepage couplings (thumbnails, exec-summary previews).
- **Phase C — Soft sections.** Sections 3.3, 3.7, 6.7, 6.8, and remaining fallback content. Ships music/arts topic, `format` field, podcast recommendations on topic pages, and the brief's optional `recommendedListen` slot.

Phasing is a planning hint, not a contract — the writing-plans skill will turn this into the actual implementation plan.
