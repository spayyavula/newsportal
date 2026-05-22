# McKinsey Article Structure + OG + Clarity Feedback (Spec 1, Phase B) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the mandatory McKinsey-style structure to articles (executive summary, lead exhibit rendered via Observable Plot, source notes). Ship dynamic Open Graph images for `/`, `/articles/[slug]`, `/topics/[slug]`, `/authors/[slug]`. Add a small private "Was this clear?" reader-feedback widget. Couple the homepage to the new article shape with a hero exhibit thumbnail and an executive-summary preview on the deep-dive panel.

**Architecture:** Three new Strapi content types and components, a new chart-rendering lib using `@observablehq/plot` + `linkedom` for server-side SVG output, three new presentational React components (`<ExecutiveSummary>`, `<Exhibit>`, `<SourceNotes>`), a shared `<OgCard>` component fed by `opengraph-image.tsx` files on four routes, and a small feedback endpoint + component pair.

**Tech Stack:** Next.js (App Router, RSC), Strapi 5, TypeScript, `@observablehq/plot` (new dep), `linkedom` (new dep, lighter than jsdom for SSR).

**Testing posture:** Build → manually verify → commit. Same as Phase A.

**Depends on:** Spec 1 Phase A plan having shipped. The article schema, CMS lib, and homepage component all extend Phase A's work.

**Editorial decisions to make before Task 4 (article schema additions):** Per the PR #1 review of Phase A, two coexistence questions need explicit answers before this plan ships. Decide both before editors start populating the new fields, or you'll end up with inconsistent content.

1. **`sources: string[]` (Phase A) vs new `sourceNotes` component (Phase B).** Decide: is `sources` deprecated (and removed via migration once `sourceNotes` is populated for the existing corpus), or does it stay as a denormalized index alongside? If deprecated, this plan should include a migration task; if kept, document the canonical reading order so renderers and content producers don't drift.
2. **`executiveSummary` (Phase B, article-level bullets) vs `editorial.explainer` (existing contentBlock with title / body / keyPoints).** Both are "here are the key points." Without an editorial style note explaining when to use which, content producers will mix them. Add a short editor admin note or schema description before Task 4.

---

## File structure

**Strapi (new files):**

- `strapi/src/components/editorial/summary-bullet.json`
- `strapi/src/components/editorial/source-note.json`
- `strapi/src/api/chart-exhibit/content-types/chart-exhibit/schema.json`
- `strapi/src/api/chart-exhibit/controllers/chart-exhibit.ts`
- `strapi/src/api/chart-exhibit/routes/chart-exhibit.ts`
- `strapi/src/api/chart-exhibit/services/chart-exhibit.ts`
- `strapi/src/api/article-feedback/content-types/article-feedback/schema.json`
- `strapi/src/api/article-feedback/controllers/article-feedback.ts`
- `strapi/src/api/article-feedback/routes/article-feedback.ts`
- `strapi/src/api/article-feedback/services/article-feedback.ts`

**Strapi (modified):**

- `strapi/src/api/article/content-types/article/schema.json` — add `executiveSummary`, `leadExhibit`, `sourceNotes`, `format` fields; add `exhibit-reference` component to `contentBlocks` dynamiczone.

**Frontend (new files):**

- `src/lib/exhibits.ts` — Observable Plot wrapper + theme.
- `src/components/executive-summary.tsx`
- `src/components/exhibit.tsx`
- `src/components/source-notes.tsx`
- `src/components/clarity-feedback.tsx`
- `src/components/og-card.tsx`
- `src/app/opengraph-image.tsx`
- `src/app/articles/[slug]/opengraph-image.tsx`
- `src/app/topics/[slug]/opengraph-image.tsx`
- `src/app/authors/[slug]/opengraph-image.tsx`
- `src/app/api/feedback/clarity/route.ts`

**Frontend (modified):**

- `package.json` — add `@observablehq/plot` and `linkedom`.
- `src/content/site.ts` — new types and fallback content (charts, exec summaries, source notes, format field on all 4 articles).
- `src/lib/cms.ts` — update `mapArticle` for new fields; add `getChartExhibit`.
- `src/components/article-content-blocks.tsx` — handle `exhibit-reference` block.
- `src/app/articles/[slug]/page.tsx` — insert executive summary + lead exhibit before body, source notes after.
- `src/components/article-card.tsx` — optional thumbnail.
- `src/components/deep-dive-panel.tsx` — exec-summary preview.
- `src/app/page.tsx` — hero card gains exhibit thumbnail.
- `src/app/globals.css` — styles for new components.

---

## Task 1: Add `editorial.summary-bullet` and `editorial.source-note` Strapi components

**Files:**
- Create: `strapi/src/components/editorial/summary-bullet.json`
- Create: `strapi/src/components/editorial/source-note.json`

- [ ] **Step 1: Create `summary-bullet.json`**

```json
{
  "collectionName": "components_editorial_summary_bullets",
  "info": {
    "displayName": "Summary bullet",
    "description": "One bullet in an article's executive summary"
  },
  "attributes": {
    "text": {
      "type": "string",
      "required": true
    }
  }
}
```

- [ ] **Step 2: Create `source-note.json`**

```json
{
  "collectionName": "components_editorial_source_notes",
  "info": {
    "displayName": "Source note",
    "description": "One citation entry under a data-led article"
  },
  "attributes": {
    "text": {
      "type": "string",
      "required": true
    },
    "url": {
      "type": "string",
      "required": false
    }
  }
}
```

- [ ] **Step 3: Build Strapi**

```bash
cd strapi && npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add strapi/src/components/editorial/summary-bullet.json strapi/src/components/editorial/source-note.json
git commit -m "Add summary-bullet and source-note Strapi components"
```

---

## Task 2: Create the `chart-exhibit` Strapi content type

**Files:**
- Create: `strapi/src/api/chart-exhibit/content-types/chart-exhibit/schema.json`
- Create: `strapi/src/api/chart-exhibit/controllers/chart-exhibit.ts`
- Create: `strapi/src/api/chart-exhibit/routes/chart-exhibit.ts`
- Create: `strapi/src/api/chart-exhibit/services/chart-exhibit.ts`

- [ ] **Step 1: Create schema**

`strapi/src/api/chart-exhibit/content-types/chart-exhibit/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "chart_exhibits",
  "info": {
    "singularName": "chart-exhibit",
    "pluralName": "chart-exhibits",
    "displayName": "Chart Exhibit",
    "description": "A reusable data exhibit (chart + caption + source note) referenced by articles"
  },
  "options": {
    "draftAndPublish": true
  },
  "attributes": {
    "figureNumber": {
      "type": "integer",
      "required": true
    },
    "title": {
      "type": "string",
      "required": true
    },
    "chartType": {
      "type": "enumeration",
      "enum": ["line", "bar", "area", "dot", "stackedBar"],
      "required": true
    },
    "series": {
      "type": "json",
      "required": true
    },
    "xAxisLabel": {
      "type": "string"
    },
    "yAxisLabel": {
      "type": "string"
    },
    "sourceNote": {
      "type": "string",
      "required": true
    }
  }
}
```

- [ ] **Step 2: Create controller / router / service**

`strapi/src/api/chart-exhibit/controllers/chart-exhibit.ts`:

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::chart-exhibit.chart-exhibit');
```

`strapi/src/api/chart-exhibit/routes/chart-exhibit.ts`:

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::chart-exhibit.chart-exhibit');
```

`strapi/src/api/chart-exhibit/services/chart-exhibit.ts`:

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::chart-exhibit.chart-exhibit');
```

- [ ] **Step 3: Build Strapi**

```bash
cd strapi && npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add strapi/src/api/chart-exhibit/
git commit -m "Add chart-exhibit Strapi content type"
```

---

## Task 3: Add a Strapi lifecycle validator for `chart-exhibit.series` shape

**Files:**
- Create: `strapi/src/api/chart-exhibit/content-types/chart-exhibit/lifecycles.ts`

- [ ] **Step 1: Write the lifecycle validator**

```ts
type SeriesPoint = { x: number | string; y: number };
type SeriesEntry = { name: string; data: SeriesPoint[] };

function isSeriesShape(value: unknown): value is SeriesEntry[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const candidate = entry as Record<string, unknown>;
    if (typeof candidate.name !== "string") return false;
    if (!Array.isArray(candidate.data)) return false;
    return candidate.data.every((point) => {
      if (!point || typeof point !== "object") return false;
      const cast = point as Record<string, unknown>;
      const xOk = typeof cast.x === "number" || typeof cast.x === "string";
      const yOk = typeof cast.y === "number";
      return xOk && yOk;
    });
  });
}

export default {
  beforeCreate(event: { params: { data: { series?: unknown } } }) {
    const series = event.params.data.series;
    if (!isSeriesShape(series)) {
      throw new Error(
        "chart-exhibit.series must be: [{ name: string, data: [{ x: number|string, y: number }, ...] }, ...]",
      );
    }
  },
  beforeUpdate(event: { params: { data: { series?: unknown } } }) {
    const series = event.params.data.series;
    if (series !== undefined && !isSeriesShape(series)) {
      throw new Error(
        "chart-exhibit.series must be: [{ name: string, data: [{ x: number|string, y: number }, ...] }, ...]",
      );
    }
  },
};
```

- [ ] **Step 2: Build Strapi**

```bash
cd strapi && npm run build
```

Expected: build succeeds. The validator runs automatically on create/update.

- [ ] **Step 3: Commit**

```bash
git add strapi/src/api/chart-exhibit/content-types/chart-exhibit/lifecycles.ts
git commit -m "Add lifecycle validator for chart-exhibit.series JSON shape"
```

---

## Task 4: Add McKinsey fields to the article schema

**Files:**
- Modify: `strapi/src/api/article/content-types/article/schema.json`

- [ ] **Step 1: Add the four new fields**

Inside the `attributes` block of `strapi/src/api/article/content-types/article/schema.json`, add these (placement order doesn't matter, but keep them near the other editorial fields for readability):

```json
"executiveSummary": {
  "type": "component",
  "repeatable": true,
  "component": "editorial.summary-bullet"
},
"leadExhibit": {
  "type": "relation",
  "relation": "oneToOne",
  "target": "api::chart-exhibit.chart-exhibit"
},
"sourceNotes": {
  "type": "component",
  "repeatable": true,
  "component": "editorial.source-note"
},
"format": {
  "type": "enumeration",
  "enum": ["data-led", "light"],
  "default": "data-led",
  "required": true
}
```

These are NOT marked `required` at the Strapi schema layer per Spec 1 §3.6 (soft enforcement). Runtime/TypeScript enforces the "data-led articles must have all three" rule.

- [ ] **Step 2: Add `editorial.exhibit-reference` component**

Create `strapi/src/components/editorial/exhibit-reference.json`:

```json
{
  "collectionName": "components_editorial_exhibit_references",
  "info": {
    "displayName": "Exhibit reference",
    "description": "Place an additional chart-exhibit inline within an article body"
  },
  "attributes": {
    "exhibit": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "api::chart-exhibit.chart-exhibit"
    }
  }
}
```

- [ ] **Step 3: Register `exhibit-reference` in the article dynamiczone**

In `strapi/src/api/article/content-types/article/schema.json`, the `contentBlocks` attribute's `components` array currently lists three components. Add the new one:

```json
"contentBlocks": {
  "type": "dynamiczone",
  "components": [
    "editorial.section-block",
    "editorial.pull-quote",
    "editorial.explainer",
    "editorial.exhibit-reference"
  ]
},
```

- [ ] **Step 4: Build Strapi**

```bash
cd strapi && npm run build
```

Expected: build succeeds. The new fields appear in the article edit view in the admin.

- [ ] **Step 5: Commit**

```bash
git add strapi/src/api/article/content-types/article/schema.json strapi/src/components/editorial/exhibit-reference.json
git commit -m "Add McKinsey fields and exhibit-reference block to article schema"
```

---

## Task 5: Install Observable Plot and linkedom

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install both dependencies**

```bash
npm install @observablehq/plot linkedom
```

Expected: success. Lock file updates.

- [ ] **Step 2: Verify build still succeeds**

```bash
npm run build
```

Expected: build succeeds (no code uses the new deps yet).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add @observablehq/plot and linkedom for server-side chart rendering"
```

---

## Task 6: Add new types to `src/content/site.ts`

**Files:**
- Modify: `src/content/site.ts`

- [ ] **Step 1: Add chart and McKinsey types**

Near the top of `src/content/site.ts`, after the existing `BriefItem` and `DailyBrief` types from Phase A (and after `StoryType`), insert:

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

export type SourceNote = { text: string; url?: string };
```

- [ ] **Step 2: Add the new `exhibit-reference` block type to the `ArticleBlock` union**

Find the `ArticleBlock` union (around line 35). Add a new variant type and include it in the union:

```ts
export type ArticleExhibitReferenceBlock = {
  type: "exhibit-reference";
  exhibit: ChartExhibit;
};

export type ArticleBlock =
  | ArticleSectionBlock
  | ArticlePullQuoteBlock
  | ArticleExplainerBlock
  | ArticleExhibitReferenceBlock;
```

- [ ] **Step 3: Add new fields to the `Article` type**

In the `Article` type (around line 51), add the four new optional fields after `featured` / `deepDive`:

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
  format: ArticleFormat;
  executiveSummary?: string[];
  leadExhibit?: ChartExhibit;
  sourceNotes?: SourceNote[];
  publishedOn: string;
  author: Author;
  topic: Topic;
};
```

Note: `format` is required (with default `"data-led"`). The other three are `?` optional per the soft-enforcement migration discipline in Spec 1 §3.6.

- [ ] **Step 4: Build to verify the type changes compile**

```bash
npm run build
```

Expected: build fails — many call sites construct `Article` objects (the four fallback articles) and now miss the required `format` field. We fix those in Task 7. Confirm the failures are all about `format` being missing, not about the new optional fields.

- [ ] **Step 5: Commit**

```bash
git add src/content/site.ts
git commit -m "Add McKinsey article types: ChartExhibit, SourceNote, ArticleFormat"
```

---

## Task 7: Migrate the 4 fallback articles to McKinsey shape

**Files:**
- Modify: `src/content/site.ts`

- [ ] **Step 1: Add a helper for chart series construction (just inline data)**

We need concrete chart data for each fallback article. Add them as constants at the top of the `articles` array (near line 414). Use the four chart types from the spec (`line`, `bar`, `area`, `dot`). The fifth type `stackedBar` is intentionally not exercised in fallback per Spec 1 §8.

Before the `articles` export, add:

```ts
const cityBudgetExhibit: ChartExhibit = {
  figureNumber: 1,
  title: "Proposed transit-service hours by line, off-peak vs peak",
  chartType: "bar",
  series: [
    {
      name: "Off-peak hours",
      data: [
        { x: "Line 14", y: 220 },
        { x: "Line 28", y: 195 },
        { x: "Line 33", y: 180 },
        { x: "Line 49", y: 165 },
      ],
    },
    {
      name: "Peak hours",
      data: [
        { x: "Line 14", y: 410 },
        { x: "Line 28", y: 395 },
        { x: "Line 33", y: 405 },
        { x: "Line 49", y: 400 },
      ],
    },
  ],
  xAxisLabel: "Bus line",
  yAxisLabel: "Hours per week",
  sourceNote: "Source: Draft FY2026 city budget, transit appendix.",
};

const gridUpgradesExhibit: ChartExhibit = {
  figureNumber: 1,
  title: "Mean outage duration by neighborhood resilience tier, 2020–2025",
  chartType: "line",
  series: [
    {
      name: "Tier 1 (high investment)",
      data: [
        { x: 2020, y: 4.1 },
        { x: 2021, y: 3.8 },
        { x: 2022, y: 3.2 },
        { x: 2023, y: 2.9 },
        { x: 2024, y: 2.4 },
        { x: 2025, y: 2.0 },
      ],
    },
    {
      name: "Tier 3 (low investment)",
      data: [
        { x: 2020, y: 6.2 },
        { x: 2021, y: 6.4 },
        { x: 2022, y: 6.1 },
        { x: 2023, y: 6.5 },
        { x: 2024, y: 6.8 },
        { x: 2025, y: 6.9 },
      ],
    },
  ],
  xAxisLabel: "Year",
  yAxisLabel: "Mean outage duration (hours)",
  sourceNote: "Source: Utility annual reliability filings, 2020–2025.",
};

const paycheckGapExhibit: ChartExhibit = {
  figureNumber: 1,
  title: "Inflation-adjusted wage growth by income decile, 2022–2025",
  chartType: "area",
  series: [
    {
      name: "Top decile",
      data: [
        { x: 2022, y: 0 },
        { x: 2023, y: 1.2 },
        { x: 2024, y: 2.4 },
        { x: 2025, y: 3.1 },
      ],
    },
    {
      name: "Bottom decile",
      data: [
        { x: 2022, y: 0 },
        { x: 2023, y: -1.4 },
        { x: 2024, y: -2.1 },
        { x: 2025, y: -2.6 },
      ],
    },
  ],
  xAxisLabel: "Year",
  yAxisLabel: "Real wage change (%)",
  sourceNote: "Source: Regional wage series + CPI-U; calculations by the newsroom.",
};

const attendanceExhibit: ChartExhibit = {
  figureNumber: 1,
  title: "Chronic absenteeism rate by district, 2023–2025",
  chartType: "dot",
  series: [
    {
      name: "Districts",
      data: [
        { x: "District A", y: 24 },
        { x: "District B", y: 19 },
        { x: "District C", y: 31 },
        { x: "District D", y: 22 },
        { x: "District E", y: 27 },
        { x: "District F", y: 18 },
      ],
    },
  ],
  xAxisLabel: "District",
  yAxisLabel: "Chronic absentee rate (%)",
  sourceNote: "Source: State department of education annual attendance reports.",
};
```

- [ ] **Step 2: Update each fallback article with McKinsey fields**

For each of the 4 article entries in the `articles` array, add `format`, `executiveSummary`, `leadExhibit`, and `sourceNotes` fields. Pattern:

Article 1 (`city-budget-transit-schools-renters`) — add after `featured: true, deepDive: false,`:

```ts
format: "data-led",
executiveSummary: [
  "The largest service cuts land off-peak, hitting riders with irregular shifts first.",
  "Total service hours are 'maintained' on paper but average frequency drops on three lines.",
  "Housing and rental assistance funding is flat; implementation begins August 1.",
  "Administrative staffing rises 12% while frontline service hours shrink 3%.",
],
leadExhibit: cityBudgetExhibit,
sourceNotes: [
  { text: "Draft FY2026 city budget, transit appendix p.41–53.", url: "https://example.org/city-budget-2026" },
  { text: "Interview with transit planner — recorded April 9.", },
  { text: "Prior-year delivery outcomes, transit department dashboard.", url: "https://example.org/transit-delivery-2025" },
],
```

Article 2 (`grid-upgrades-and-heat-risk`) — add after `featured: false, deepDive: true,`:

```ts
format: "data-led",
executiveSummary: [
  "Resilience spending only reduces outage duration where capital plans actually fund transformer replacement.",
  "Tier 1 neighborhoods saw a 51% reduction in mean outage duration over 5 years; Tier 3 saw an 11% increase.",
  "Heat-vulnerability funding is flat in the current capital plan despite the trend.",
  "Restoration timelines matter more than outage frequency for heat-exposed residents.",
],
leadExhibit: gridUpgradesExhibit,
sourceNotes: [
  { text: "Utility capital plans, 2020–2025.", url: "https://example.org/utility-capital-plans" },
  { text: "Regional heat-risk assessment, EPA.", url: "https://example.org/heat-risk" },
  { text: "Interviews with three resilience planners, March 2025." },
],
```

Article 3 (`paycheck-inflation-gap-households`) — add after `featured: false, deepDive: false,`:

```ts
format: "data-led",
executiveSummary: [
  "Headline wage growth is up 3.1% for the top decile and down 2.6% for the bottom decile, inflation-adjusted.",
  "Rent, care, and transport costs broke the headline average for renter households.",
  "Regional averages mask larger declines in two of five tracked metros.",
],
leadExhibit: paycheckGapExhibit,
sourceNotes: [
  { text: "Regional wage series, Federal Reserve.", url: "https://example.org/wage-series" },
  { text: "Consumer Expenditure Survey, BLS.", url: "https://example.org/cex" },
  { text: "Interviews with two union representatives and one employer." },
],
```

Article 4 (`attendance-panic-better-measurement`) — add after `featured: false, deepDive: false,`:

```ts
format: "data-led",
executiveSummary: [
  "Chronic absenteeism varies by 13 points across districts within the same state.",
  "Health-related absences account for roughly 40% of the difference between top and bottom districts.",
  "Two interventions with the strongest evidence base have not been adopted by the highest-absence district.",
],
leadExhibit: attendanceExhibit,
sourceNotes: [
  { text: "State department of education annual attendance reports.", url: "https://example.org/attendance" },
  { text: "Interviews with three school social workers." },
  { text: "Attendance intervention evaluations, RAND review." },
],
```

- [ ] **Step 3: Build to verify**

```bash
npm run build
```

Expected: build succeeds. All `Article` objects now have `format` populated. Optional fields are populated for all four fallbacks.

- [ ] **Step 4: Commit**

```bash
git add src/content/site.ts
git commit -m "Migrate fallback articles to McKinsey shape with exec summary and exhibits"
```

---

## Task 8: Update `mapArticle` in `src/lib/cms.ts` for the new fields

**Files:**
- Modify: `src/lib/cms.ts`

- [ ] **Step 1: Update imports**

The existing imports at the top of the file need the new types:

```ts
import type {
  Article,
  ArticleBlock,
  Author,
  BriefItem,
  ChartExhibit,
  DailyBrief,
  SourceNote,
  Topic,
} from "@/content/site";
```

- [ ] **Step 2: Add a `mapChartExhibit` helper**

Near `mapBriefItem` (added in Phase A), add:

```ts
function mapChartExhibit(entity: StrapiEntity | null): ChartExhibit | null {
  if (!entity) {
    return null;
  }

  const figureNumber = entity.figureNumber;
  const title = entity.title;
  const chartType = entity.chartType;
  const series = entity.series;
  const sourceNote = entity.sourceNote;

  if (
    typeof figureNumber !== "number" ||
    typeof title !== "string" ||
    (chartType !== "line" &&
      chartType !== "bar" &&
      chartType !== "area" &&
      chartType !== "dot" &&
      chartType !== "stackedBar") ||
    !Array.isArray(series) ||
    typeof sourceNote !== "string"
  ) {
    return null;
  }

  return {
    figureNumber,
    title,
    chartType,
    series: series as ChartExhibit["series"],
    xAxisLabel: typeof entity.xAxisLabel === "string" ? entity.xAxisLabel : undefined,
    yAxisLabel: typeof entity.yAxisLabel === "string" ? entity.yAxisLabel : undefined,
    sourceNote,
  };
}
```

- [ ] **Step 3: Add a `mapSourceNote` helper**

```ts
function mapSourceNote(entry: unknown): SourceNote | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const cast = entry as Record<string, unknown>;
  if (typeof cast.text !== "string") return null;

  return {
    text: cast.text,
    url: typeof cast.url === "string" && cast.url.trim().length > 0 ? cast.url : undefined,
  };
}
```

- [ ] **Step 4: Update `mapArticleBlocks` to handle `exhibit-reference`**

In `mapArticleBlocks`, add a case for the new component:

```ts
if (block.__component === "editorial.exhibit-reference") {
  const exhibit = mapChartExhibit(unwrapRelation(block.exhibit));
  if (exhibit) {
    return {
      type: "exhibit-reference" as const,
      exhibit,
    };
  }
}
```

- [ ] **Step 5: Update `mapArticle` to populate the new fields**

In `mapArticle`, after `topic` is resolved (around line 272), add:

```ts
const executiveSummaryRaw = entity.executiveSummary;
const leadExhibitRaw = entity.leadExhibit;
const sourceNotesRaw = entity.sourceNotes;
const format = entity.format;
```

In the returned object (around lines 290–305), add these fields:

```ts
format: format === "light" ? "light" : "data-led",
executiveSummary: Array.isArray(executiveSummaryRaw)
  ? executiveSummaryRaw
      .map((entry) =>
        entry && typeof entry === "object" && typeof (entry as { text?: unknown }).text === "string"
          ? (entry as { text: string }).text
          : null,
      )
      .filter((item): item is string => Boolean(item))
  : fallback?.executiveSummary,
leadExhibit: mapChartExhibit(unwrapRelation(leadExhibitRaw)) ?? fallback?.leadExhibit,
sourceNotes: Array.isArray(sourceNotesRaw)
  ? sourceNotesRaw.map(mapSourceNote).filter((item): item is SourceNote => Boolean(item))
  : fallback?.sourceNotes,
```

- [ ] **Step 6: Build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/lib/cms.ts
git commit -m "Map McKinsey article fields from Strapi: format, executiveSummary, leadExhibit, sourceNotes"
```

---

## Task 9: Add `getChartExhibit` (for future inline exhibit lookups)

**Files:**
- Modify: `src/lib/cms.ts`

- [ ] **Step 1: Add the function**

Near the other lookup functions (after `getDailyBrief`), add:

```ts
export async function getChartExhibit(
  figureNumber: number,
  options: QueryOptions = {},
): Promise<ChartExhibit | null> {
  const response = await fetchStrapi<StrapiListResponse<StrapiEntity>>(
    `/api/chart-exhibits?filters[figureNumber][$eq]=${figureNumber}&pagination[limit]=1`,
    options,
  );

  const first = response?.data?.[0];
  return mapChartExhibit(first ?? null);
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/cms.ts
git commit -m "Add getChartExhibit lookup helper"
```

---

## Task 10: Build `src/lib/exhibits.ts` — Observable Plot theme and renderers

**Files:**
- Create: `src/lib/exhibits.ts`

- [ ] **Step 1: Write the module**

```ts
import "server-only";
import * as Plot from "@observablehq/plot";
import { parseHTML } from "linkedom";
import type { ChartExhibit } from "@/content/site";

export const chartTheme = {
  fontFamily:
    'var(--font-newsreader), Georgia, "Times New Roman", serif',
  fontSize: 12,
  axisColor: "#888",
  textColor: "#222",
  seriesPalette: ["#c4a662", "#2f2f2f"],
  gridLineColor: "#e8e3d8",
};

type RenderOptions = {
  width?: number;
  height?: number;
  compact?: boolean;
};

function makeDocument() {
  const { document } = parseHTML("<!DOCTYPE html><html><body></body></html>");
  return document;
}

function buildMarks(exhibit: ChartExhibit) {
  const allPoints = exhibit.series.flatMap((s, seriesIndex) =>
    s.data.map((point) => ({
      x: point.x,
      y: point.y,
      name: s.name,
      _color: chartTheme.seriesPalette[seriesIndex % chartTheme.seriesPalette.length],
    })),
  );

  switch (exhibit.chartType) {
    case "line":
      return [
        Plot.ruleY([0], { stroke: chartTheme.axisColor, strokeOpacity: 0.3 }),
        Plot.lineY(allPoints, {
          x: "x",
          y: "y",
          stroke: "name",
          strokeWidth: 1.6,
        }),
      ];
    case "area":
      return [
        Plot.ruleY([0], { stroke: chartTheme.axisColor, strokeOpacity: 0.3 }),
        Plot.areaY(allPoints, {
          x: "x",
          y: "y",
          fill: "name",
          fillOpacity: 0.2,
          stroke: "name",
          strokeWidth: 1.6,
        }),
      ];
    case "bar":
      return [
        Plot.barY(allPoints, {
          x: "x",
          y: "y",
          fill: "name",
          fx: "x",
        }),
      ];
    case "dot":
      return [
        Plot.dot(allPoints, {
          x: "x",
          y: "y",
          fill: "name",
          r: 5,
        }),
      ];
    case "stackedBar":
      return [
        Plot.barY(allPoints, {
          x: "x",
          y: "y",
          fill: "name",
        }),
      ];
  }
}

export function renderExhibitToSvg(
  exhibit: ChartExhibit,
  options: RenderOptions = {},
): string {
  const document = makeDocument() as unknown as Document;
  const width = options.width ?? (options.compact ? 320 : 720);
  const height = options.height ?? (options.compact ? 120 : 360);

  const chart = Plot.plot({
    document,
    width,
    height,
    style: {
      fontFamily: chartTheme.fontFamily,
      fontSize: chartTheme.fontSize,
      color: chartTheme.textColor,
      background: "transparent",
    },
    color: {
      type: "categorical",
      range: chartTheme.seriesPalette,
    },
    x: {
      label: options.compact ? null : exhibit.xAxisLabel ?? null,
      grid: !options.compact,
    },
    y: {
      label: options.compact ? null : exhibit.yAxisLabel ?? null,
      grid: !options.compact,
    },
    marks: buildMarks(exhibit),
  });

  return (chart as unknown as Element).outerHTML;
}
```

- [ ] **Step 2: Build to verify**

```bash
npm run build
```

Expected: build succeeds. The module is server-only and not yet consumed; this just confirms imports resolve.

- [ ] **Step 3: Commit**

```bash
git add src/lib/exhibits.ts
git commit -m "Add exhibits.ts: Observable Plot wrapper with site-themed renderers"
```

---

## Task 11: Create the `<Exhibit>` component

**Files:**
- Create: `src/components/exhibit.tsx`

- [ ] **Step 1: Write the component**

```tsx
import "server-only";
import type { ChartExhibit } from "@/content/site";
import { renderExhibitToSvg } from "@/lib/exhibits";

type ExhibitProps = {
  exhibit: ChartExhibit;
  variant?: "default" | "compact";
  className?: string;
};

export function Exhibit({ exhibit, variant = "default", className }: ExhibitProps) {
  const compact = variant === "compact";
  const svg = renderExhibitToSvg(exhibit, { compact });
  const ariaLabel = `${exhibit.title}. ${exhibit.sourceNote}`;
  const figureClass = `exhibit exhibit-${variant}${className ? ` ${className}` : ""}`;

  if (compact) {
    return (
      <div
        aria-label={ariaLabel}
        className={figureClass}
        role="img"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  return (
    <figure aria-label={ariaLabel} className={figureClass} role="img">
      <div className="exhibit-chart" dangerouslySetInnerHTML={{ __html: svg }} />
      <figcaption className="exhibit-caption">
        <strong>Exhibit {exhibit.figureNumber}.</strong> {exhibit.title}
        <span className="exhibit-source">{exhibit.sourceNote}</span>
      </figcaption>
    </figure>
  );
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/exhibit.tsx
git commit -m "Add Exhibit component for rendering chart exhibits with captions"
```

---

## Task 12: Create the `<ExecutiveSummary>` component

**Files:**
- Create: `src/components/executive-summary.tsx`

- [ ] **Step 1: Write the component**

```tsx
type ExecutiveSummaryProps = {
  bullets: string[];
};

export function ExecutiveSummary({ bullets }: ExecutiveSummaryProps) {
  if (bullets.length === 0) {
    return null;
  }

  return (
    <section className="executive-summary">
      <p className="eyebrow">Key findings</p>
      <ul className="executive-summary-list">
        {bullets.map((bullet, index) => (
          <li key={index} className="executive-summary-item">
            {bullet}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/executive-summary.tsx
git commit -m "Add ExecutiveSummary component (key findings card)"
```

---

## Task 13: Create the `<SourceNotes>` component

**Files:**
- Create: `src/components/source-notes.tsx`

- [ ] **Step 1: Write the component**

```tsx
import type { SourceNote } from "@/content/site";

type SourceNotesProps = {
  notes: SourceNote[];
};

export function SourceNotes({ notes }: SourceNotesProps) {
  if (notes.length === 0) {
    return null;
  }

  return (
    <section className="source-notes">
      <p className="eyebrow">Source notes</p>
      <ol className="source-notes-list">
        {notes.map((note, index) => (
          <li key={index} className="source-notes-item">
            {note.url ? (
              <a href={note.url} rel="noreferrer" target="_blank">
                {note.text}
              </a>
            ) : (
              note.text
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/source-notes.tsx
git commit -m "Add SourceNotes component for end-of-article citations"
```

---

## Task 14: Update `ArticleContentBlocks` to handle `exhibit-reference` blocks

**Files:**
- Modify: `src/components/article-content-blocks.tsx`

- [ ] **Step 1: Add the new case**

In `src/components/article-content-blocks.tsx`, add an `import { Exhibit } from "@/components/exhibit";` and add a new case to the switch inside `.map`. The full updated file:

```tsx
import { Exhibit } from "@/components/exhibit";
import type { ArticleBlock } from "@/content/site";

type ArticleContentBlocksProps = {
  blocks: ArticleBlock[];
};

export function ArticleContentBlocks({ blocks }: ArticleContentBlocksProps) {
  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="article-blocks">
      {blocks.map((block, index) => {
        if (block.type === "section") {
          return (
            <section key={`${block.heading}-${index}`} className="article-section-block">
              <h2>{block.heading}</h2>
              <div dangerouslySetInnerHTML={{ __html: block.body }} />
            </section>
          );
        }

        if (block.type === "pull-quote") {
          return (
            <figure key={`${block.quote}-${index}`} className="article-pull-quote">
              <blockquote>{block.quote}</blockquote>
              <figcaption>
                {block.attribution}
                {block.role ? `, ${block.role}` : ""}
              </figcaption>
            </figure>
          );
        }

        if (block.type === "exhibit-reference") {
          return (
            <Exhibit
              key={`exhibit-${block.exhibit.figureNumber}-${index}`}
              exhibit={block.exhibit}
            />
          );
        }

        return (
          <aside key={`${block.title}-${index}`} className="article-explainer">
            <p className="eyebrow">Explainer</p>
            <h2>{block.title}</h2>
            <p>{block.body}</p>
            <ul>
              {block.keyPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </aside>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/article-content-blocks.tsx
git commit -m "Render exhibit-reference blocks inline in articles"
```

---

## Task 15: Update the article page to render the McKinsey structure

**Files:**
- Modify: `src/app/articles/[slug]/page.tsx`

- [ ] **Step 1: Update imports and the layout**

Add imports for the new components at the top:

```tsx
import { ExecutiveSummary } from "@/components/executive-summary";
import { Exhibit } from "@/components/exhibit";
import { SourceNotes } from "@/components/source-notes";
```

Inside `ArticlePage`, modify the article-body block to insert the McKinsey sections. Replace the existing `<article className="article-body">…</article>` JSX (lines 86–89) with:

```tsx
<article className="article-body">
  {article.format === "data-led" &&
  article.executiveSummary &&
  article.executiveSummary.length > 0 ? (
    <ExecutiveSummary bullets={article.executiveSummary} />
  ) : null}

  {article.format === "data-led" && article.leadExhibit ? (
    <Exhibit exhibit={article.leadExhibit} />
  ) : null}

  <div dangerouslySetInnerHTML={{ __html: article.body }} />
  <ArticleContentBlocks blocks={article.contentBlocks} />

  {article.format === "data-led" &&
  article.sourceNotes &&
  article.sourceNotes.length > 0 ? (
    <SourceNotes notes={article.sourceNotes} />
  ) : null}
</article>
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Manual sanity check**

```bash
npm run dev
```

Open http://localhost:3000/articles/city-budget-transit-schools-renters in a browser. Verify:

- "Key findings" card with 4 bullets appears above the body.
- A chart titled "Exhibit 1. Proposed transit-service hours by line, off-peak vs peak" renders below the exec summary.
- Body prose follows.
- "Source notes" section appears at the end with 3 citations (two of them links).

Open http://localhost:3000/articles/attendance-panic-better-measurement. Same structure but with the dot chart.

- [ ] **Step 4: Commit**

```bash
git add src/app/articles/[slug]/page.tsx
git commit -m "Render executive summary, lead exhibit, and source notes on article pages"
```

---

## Task 16: Add CSS for the new article-page components

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Append the styles**

At the end of `src/app/globals.css`:

```css
/* ===== McKinsey article structure ===== */

.executive-summary {
  margin: 1.5rem 0 2rem;
  padding: 1.25rem 1.5rem;
  background: #fbf9f4;
  border: 1px solid #e8e3d8;
  border-radius: 4px;
}

.executive-summary-list {
  margin: 0.5rem 0 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.executive-summary-item {
  font-family: var(--font-newsreader), Georgia, "Times New Roman", serif;
  font-size: 1.02rem;
  line-height: 1.55;
  color: #222;
}

.exhibit {
  margin: 2rem 0;
}

.exhibit-chart svg {
  display: block;
  width: 100%;
  height: auto;
  max-width: 100%;
}

.exhibit-caption {
  margin-top: 0.6rem;
  font-family: var(--font-franklin), -apple-system, "Segoe UI", sans-serif;
  font-size: 0.85rem;
  line-height: 1.45;
  color: #444;
}

.exhibit-source {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.8rem;
  color: #666;
}

.exhibit-compact {
  margin: 0.5rem 0 0;
}

.exhibit-compact svg {
  display: block;
  width: 100%;
  height: auto;
}

.source-notes {
  margin: 2.5rem 0 0;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(17, 17, 17, 0.18);
}

.source-notes-list {
  margin: 0.5rem 0 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.source-notes-item {
  font-size: 0.92rem;
  line-height: 1.5;
  color: #333;
}

.source-notes-item a {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: rgba(17, 17, 17, 0.3);
  text-underline-offset: 3px;
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "Add CSS for executive summary, exhibits, and source notes"
```

---

## Task 17: Add the optional thumbnail to `<ArticleCard>`

**Files:**
- Modify: `src/components/article-card.tsx`

- [ ] **Step 1: Update the component**

```tsx
import Link from "next/link";
import { Exhibit } from "@/components/exhibit";
import type { Article } from "@/content/site";

type ArticleCardProps = {
  article: Article;
};

export function ArticleCard({ article }: ArticleCardProps) {
  const showThumbnail = article.format === "data-led" && article.leadExhibit;

  return (
    <article className="article-card">
      {showThumbnail ? (
        <div className="article-card-thumbnail">
          <Exhibit exhibit={article.leadExhibit!} variant="compact" />
        </div>
      ) : null}
      <div className="article-card-topline">
        <span className="label-pill">{article.storyType}</span>
        <span>{article.topic.name}</span>
        <span>{article.readTime}</span>
      </div>
      <h3>
        <Link href={`/articles/${article.slug}`}>{article.title}</Link>
      </h3>
      <p className="article-card-summary">{article.summary}</p>
      <div className="article-card-meta">
        <span className="byline-name">By {article.author.name.toUpperCase()}</span>
        <span>
          {new Date(article.publishedOn).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Add CSS**

Append to `src/app/globals.css`:

```css
.article-card-thumbnail {
  margin-bottom: 0.75rem;
  padding: 0.25rem;
  background: #fafafa;
  border: 1px solid #efece6;
  border-radius: 2px;
  max-height: 100px;
  overflow: hidden;
}
```

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/article-card.tsx src/app/globals.css
git commit -m "Add optional lead-exhibit thumbnail to ArticleCard"
```

---

## Task 18: Add hero exhibit thumbnail to the homepage

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update imports and the hero card**

Add to imports:

```tsx
import { Exhibit } from "@/components/exhibit";
```

In the hero card JSX (inside `<div className="hero-card">`), add a thumbnail just after the existing `<p>{anchorArticle?.summary ?? …}</p>` line:

```tsx
{anchorArticle?.leadExhibit ? (
  <div className="hero-card-thumbnail">
    <Exhibit exhibit={anchorArticle.leadExhibit} variant="compact" />
  </div>
) : null}
```

- [ ] **Step 2: Add CSS**

Append to `src/app/globals.css`:

```css
.hero-card-thumbnail {
  margin: 0.5rem 0;
  padding: 0.25rem;
  background: #fafafa;
  border: 1px solid #efece6;
  border-radius: 2px;
}
```

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/app/globals.css
git commit -m "Show lead-exhibit thumbnail in homepage hero card"
```

---

## Task 19: Add exec-summary preview to `<DeepDivePanel>`

**Files:**
- Modify: `src/components/deep-dive-panel.tsx`

- [ ] **Step 1: Update the component**

```tsx
import Link from "next/link";
import type { Article } from "@/content/site";

export function DeepDivePanel({ article }: { article: Article }) {
  const summaryBullets = article.executiveSummary ?? [];
  const previewBullets = summaryBullets.slice(0, 2);
  const remaining = summaryBullets.length - previewBullets.length;

  return (
    <article className="panel story-feature deep-dive-panel">
      <p className="eyebrow">Deep dive</p>
      <div className="story-meta">
        <span>{article.topic.name}</span>
        <span>{article.readTime}</span>
      </div>
      <h2>{article.title}</h2>
      <p>{article.summary}</p>

      {previewBullets.length > 0 ? (
        <ul className="deep-dive-summary-preview">
          {previewBullets.map((bullet, index) => (
            <li key={index}>{bullet}</li>
          ))}
          {remaining > 0 ? (
            <li className="deep-dive-summary-more">
              …and {remaining} more finding{remaining === 1 ? "" : "s"}.
            </li>
          ) : null}
        </ul>
      ) : null}

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

- [ ] **Step 2: Add CSS**

Append to `src/app/globals.css`:

```css
.deep-dive-summary-preview {
  margin: 0.5rem 0 1rem;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-family: var(--font-newsreader), Georgia, serif;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #222;
}

.deep-dive-summary-more {
  list-style: none;
  margin-left: -1.25rem;
  font-style: italic;
  color: #666;
}
```

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/deep-dive-panel.tsx src/app/globals.css
git commit -m "Show first two executive-summary bullets as preview on DeepDivePanel"
```

---

## Task 20: Create the shared `<OgCard>` component

**Files:**
- Create: `src/components/og-card.tsx`

- [ ] **Step 1: Write the component**

This is rendered inside Next.js `ImageResponse`, which uses Satori. Satori has a restricted JSX feature set — only inline styles, no CSS classes, no SVG-by-default.

```tsx
import type { CSSProperties, ReactNode } from "react";

type OgCardProps = {
  kicker?: string;
  title: string;
  subtitle?: string;
};

const baseStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  background: "#fbf9f4",
  padding: 72,
  fontFamily: "Newsreader, Georgia, serif",
  color: "#111",
};

const kickerStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  letterSpacing: 8,
  textTransform: "uppercase",
  color: "#555",
  fontFamily: "sans-serif",
};

const titleStyle: CSSProperties = {
  fontSize: 72,
  lineHeight: 1.05,
  fontWeight: 500,
  letterSpacing: -1,
};

const subtitleStyle: CSSProperties = {
  fontSize: 32,
  color: "#444",
  marginTop: 12,
};

const brandRowStyle: CSSProperties = {
  display: "flex",
  borderTop: "1px solid rgba(17,17,17,0.2)",
  paddingTop: 24,
  fontSize: 28,
  letterSpacing: 4,
  textTransform: "uppercase",
  color: "#111",
  fontFamily: "sans-serif",
  fontWeight: 700,
};

export function OgCard({ kicker, title, subtitle }: OgCardProps): ReactNode {
  return (
    <div style={baseStyle}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {kicker ? <div style={kickerStyle}>{kicker}</div> : null}
        <div style={titleStyle}>{title}</div>
        {subtitle ? <div style={subtitleStyle}>{subtitle}</div> : null}
      </div>
      <div style={brandRowStyle}>Common Ground</div>
    </div>
  );
}

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: build succeeds. The component is only consumed by `opengraph-image.tsx` files in the next tasks.

- [ ] **Step 3: Commit**

```bash
git add src/components/og-card.tsx
git commit -m "Add shared OgCard component for dynamic Open Graph images"
```

---

## Task 21: Add `opengraph-image.tsx` for the homepage

**Files:**
- Create: `src/app/opengraph-image.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { ImageResponse } from "next/og";
import { OgCard, OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-card";
import { getHomepageData } from "@/lib/cms";

export const runtime = "nodejs";
export const contentType = OG_CONTENT_TYPE;
export const size = OG_SIZE;
export const alt = "Common Ground — calm, source-linked, public-interest news";

export default async function HomepageOgImage() {
  const { anchorArticle } = await getHomepageData();

  return new ImageResponse(
    (
      <OgCard
        title="Common Ground"
        subtitle={
          anchorArticle?.title ??
          "Advertisement-free reporting for public life."
        }
      />
    ),
    { ...OG_SIZE },
  );
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: build succeeds. The route compiles.

- [ ] **Step 3: Verify in dev**

```bash
npm run dev
```

Open http://localhost:3000/opengraph-image in a browser. Expected: a 1200×630 PNG showing "Common Ground" + today's anchor article title + "Common Ground" wordmark at the bottom.

- [ ] **Step 4: Commit**

```bash
git add src/app/opengraph-image.tsx
git commit -m "Add dynamic OG image for the homepage"
```

---

## Task 22: Add `opengraph-image.tsx` for article pages

**Files:**
- Create: `src/app/articles/[slug]/opengraph-image.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { ImageResponse } from "next/og";
import { OgCard, OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-card";
import { getArticleBySlug } from "@/lib/cms";

export const runtime = "nodejs";
export const contentType = OG_CONTENT_TYPE;
export const size = OG_SIZE;
export const alt = "Common Ground article";

type Props = {
  params: { slug: string };
};

export default async function ArticleOgImage({ params }: Props) {
  const article = await getArticleBySlug(params.slug);

  if (!article) {
    return new ImageResponse(
      <OgCard title="Common Ground" subtitle="Article not found." />,
      { ...OG_SIZE },
    );
  }

  return new ImageResponse(
    (
      <OgCard
        kicker={article.topic.name}
        title={article.title}
        subtitle={`By ${article.author.name}`}
      />
    ),
    { ...OG_SIZE },
  );
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Verify in dev**

Open http://localhost:3000/articles/city-budget-transit-schools-renters/opengraph-image. Expected: 1200×630 PNG with kicker "Civic Life", title, byline.

- [ ] **Step 4: Commit**

```bash
git add src/app/articles/[slug]/opengraph-image.tsx
git commit -m "Add dynamic OG image for article pages"
```

---

## Task 23: Add `opengraph-image.tsx` for topic pages

**Files:**
- Create: `src/app/topics/[slug]/opengraph-image.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { ImageResponse } from "next/og";
import { OgCard, OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-card";
import { getTopicBySlug } from "@/lib/cms";

export const runtime = "nodejs";
export const contentType = OG_CONTENT_TYPE;
export const size = OG_SIZE;
export const alt = "Common Ground topic";

type Props = {
  params: { slug: string };
};

export default async function TopicOgImage({ params }: Props) {
  const topic = await getTopicBySlug(params.slug);

  if (!topic) {
    return new ImageResponse(
      <OgCard title="Common Ground" subtitle="Topic not found." />,
      { ...OG_SIZE },
    );
  }

  return new ImageResponse(
    (
      <OgCard
        kicker="Topic"
        title={topic.name}
        subtitle={topic.description}
      />
    ),
    { ...OG_SIZE },
  );
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Verify**

Open http://localhost:3000/topics/civic-life/opengraph-image. Expected: 1200×630 PNG.

- [ ] **Step 4: Commit**

```bash
git add src/app/topics/[slug]/opengraph-image.tsx
git commit -m "Add dynamic OG image for topic pages"
```

---

## Task 24: Add `opengraph-image.tsx` for author pages

**Files:**
- Create: `src/app/authors/[slug]/opengraph-image.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { ImageResponse } from "next/og";
import { OgCard, OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-card";
import { getAuthorBySlug } from "@/lib/cms";

export const runtime = "nodejs";
export const contentType = OG_CONTENT_TYPE;
export const size = OG_SIZE;
export const alt = "Common Ground author";

type Props = {
  params: { slug: string };
};

export default async function AuthorOgImage({ params }: Props) {
  const author = await getAuthorBySlug(params.slug);

  if (!author) {
    return new ImageResponse(
      <OgCard title="Common Ground" subtitle="Author not found." />,
      { ...OG_SIZE },
    );
  }

  return new ImageResponse(
    <OgCard kicker="Author" title={author.name} subtitle={author.role} />,
    { ...OG_SIZE },
  );
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Verify**

Open http://localhost:3000/authors/maya-chen/opengraph-image. Expected: 1200×630 PNG.

- [ ] **Step 4: Commit**

```bash
git add src/app/authors/[slug]/opengraph-image.tsx
git commit -m "Add dynamic OG image for author pages"
```

---

## Task 25: Create `article-feedback` Strapi content type

**Files:**
- Create: `strapi/src/api/article-feedback/content-types/article-feedback/schema.json`
- Create: `strapi/src/api/article-feedback/controllers/article-feedback.ts`
- Create: `strapi/src/api/article-feedback/routes/article-feedback.ts`
- Create: `strapi/src/api/article-feedback/services/article-feedback.ts`

- [ ] **Step 1: Create schema**

`strapi/src/api/article-feedback/content-types/article-feedback/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "article_feedbacks",
  "info": {
    "singularName": "article-feedback",
    "pluralName": "article-feedbacks",
    "displayName": "Article Feedback",
    "description": "Private 'Was this clear?' reader feedback"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "article": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::article.article"
    },
    "articleSlug": {
      "type": "string",
      "required": true
    },
    "clarity": {
      "type": "enumeration",
      "enum": ["yes", "no"],
      "required": true
    },
    "comment": {
      "type": "text"
    },
    "submittedAt": {
      "type": "datetime",
      "required": true
    },
    "userAgent": {
      "type": "string"
    }
  }
}
```

- [ ] **Step 2: Create controller / router / service**

`strapi/src/api/article-feedback/controllers/article-feedback.ts`:

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::article-feedback.article-feedback');
```

`strapi/src/api/article-feedback/routes/article-feedback.ts`:

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::article-feedback.article-feedback');
```

`strapi/src/api/article-feedback/services/article-feedback.ts`:

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::article-feedback.article-feedback');
```

- [ ] **Step 3: Restrict permissions in Strapi (manual after deploy)**

Document for the engineer: after the next Strapi deploy, open the Strapi admin → Settings → Users & Permissions → Roles → Public, and grant `article-feedback.create` only. Read/update/delete stay on the Authenticated/Admin roles. This is a one-time manual step; Strapi doesn't auto-grant the route permissions.

- [ ] **Step 4: Build**

```bash
cd strapi && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add strapi/src/api/article-feedback/
git commit -m "Add article-feedback Strapi content type for private clarity feedback"
```

---

## Task 26: Implement the `/api/feedback/clarity` endpoint

**Files:**
- Create: `src/app/api/feedback/clarity/route.ts`

- [ ] **Step 1: Write the route**

```ts
import "server-only";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? process.env.STRAPI_URL;
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

// In-memory rate limit. 60s window, key by ip:slug.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = new Map<string, number>();
const rateLimitGuard = new Map<string, number>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const last = rateLimitGuard.get(key);
  if (last && now - last < RATE_LIMIT_WINDOW_MS) {
    return true;
  }
  rateLimitGuard.set(key, now);

  // Periodic cleanup
  if (rateLimitGuard.size > 1024) {
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    for (const [k, timestamp] of rateLimitGuard.entries()) {
      if (timestamp < cutoff) rateLimitGuard.delete(k);
    }
  }
  return false;
}

function sanitiseComment(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.replace(/<[^>]+>/g, "").trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, 1000);
}

function normaliseBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export async function POST(request: Request) {
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return NextResponse.json({ error: "feedback-disabled" }, { status: 503 });
  }

  let payload: { slug?: unknown; clarity?: unknown; comment?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const slug = typeof payload.slug === "string" ? payload.slug.trim() : "";
  const clarity = payload.clarity;
  const comment = sanitiseComment(payload.comment);

  if (!slug || (clarity !== "yes" && clarity !== "no")) {
    return NextResponse.json({ error: "invalid-payload" }, { status: 400 });
  }

  const ip = getClientIp(request);
  const rateKey = `${ip}:${slug}`;
  if (isRateLimited(rateKey)) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 200);

  try {
    const response = await fetch(`${normaliseBaseUrl(STRAPI_URL)}/api/article-feedbacks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify({
        data: {
          articleSlug: slug,
          clarity,
          comment,
          submittedAt: new Date().toISOString(),
          userAgent,
        },
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "downstream-failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "network" }, { status: 502 });
  }
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/feedback/clarity/route.ts
git commit -m "Add POST /api/feedback/clarity endpoint with rate limit and sanitisation"
```

---

## Task 27: Create the `<ClarityFeedback>` component

**Files:**
- Create: `src/components/clarity-feedback.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useEffect, useState } from "react";

type ClarityFeedbackProps = {
  slug: string;
};

type State = "idle" | "no-branch" | "submitting" | "thanks";

const storageKey = (slug: string) => `cg-feedback-clarity:${slug}`;

export function ClarityFeedback({ slug }: ClarityFeedbackProps) {
  const [state, setState] = useState<State>("idle");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(storageKey(slug))) {
      setState("thanks");
    }
  }, [slug]);

  async function submit(clarity: "yes" | "no", commentValue?: string) {
    setState("submitting");
    try {
      await fetch("/api/feedback/clarity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, clarity, comment: commentValue }),
      });
    } catch {
      // Swallow — we still want the UI to thank the reader.
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey(slug), "1");
    }
    setState("thanks");
  }

  if (state === "thanks") {
    return (
      <section className="clarity-feedback clarity-feedback-thanks">
        Thanks — noted.
      </section>
    );
  }

  if (state === "no-branch") {
    return (
      <section className="clarity-feedback">
        <p className="clarity-feedback-question">What was unclear? <span className="clarity-feedback-optional">(optional)</span></p>
        <textarea
          className="clarity-feedback-textarea"
          maxLength={1000}
          onChange={(event) => setComment(event.target.value)}
          rows={3}
          value={comment}
        />
        <button
          className="button-secondary"
          onClick={() => void submit("no", comment)}
          type="button"
        >
          Send feedback
        </button>
      </section>
    );
  }

  return (
    <section className="clarity-feedback">
      <p className="clarity-feedback-question">Was this clear?</p>
      <div className="clarity-feedback-actions">
        <button
          className="clarity-feedback-pill"
          disabled={state === "submitting"}
          onClick={() => void submit("yes")}
          type="button"
        >
          Yes
        </button>
        <button
          className="clarity-feedback-pill"
          disabled={state === "submitting"}
          onClick={() => setState("no-branch")}
          type="button"
        >
          No
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire into the article page**

In `src/app/articles/[slug]/page.tsx`, import the component:

```tsx
import { ClarityFeedback } from "@/components/clarity-feedback";
```

And add it inside the `.article-body` block, after `<SourceNotes …>` (the last existing element):

```tsx
<ClarityFeedback slug={article.slug} />
```

- [ ] **Step 3: Add CSS**

Append to `src/app/globals.css`:

```css
.clarity-feedback {
  margin: 2rem 0 0;
  padding: 1rem 1.25rem;
  background: #fbfbf9;
  border: 1px solid #ebe7df;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.clarity-feedback-question {
  margin: 0;
  font-family: var(--font-franklin), -apple-system, "Segoe UI", sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #555;
}

.clarity-feedback-optional {
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
  color: #888;
}

.clarity-feedback-actions {
  display: flex;
  gap: 0.5rem;
}

.clarity-feedback-pill {
  padding: 0.4rem 1rem;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 3px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.9rem;
  color: #222;
}

.clarity-feedback-pill:hover:not(:disabled) {
  border-color: #888;
}

.clarity-feedback-textarea {
  width: 100%;
  padding: 0.5rem 0.6rem;
  border: 1px solid #ddd;
  border-radius: 3px;
  font-family: inherit;
  font-size: 0.95rem;
  resize: vertical;
}

.clarity-feedback-thanks {
  font-style: italic;
  color: #555;
}
```

- [ ] **Step 4: Build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/clarity-feedback.tsx src/app/articles/[slug]/page.tsx src/app/globals.css
git commit -m "Add ClarityFeedback widget at the bottom of articles"
```

---

## Task 28: End-to-end manual verification

**Files:**
- None modified — verification only.

- [ ] **Step 1: Builds clean**

```bash
npm run build && (cd strapi && npm run build)
```

Expected: both succeed.

- [ ] **Step 2: Dev server, no Strapi**

```bash
npm run dev
```

Verify on http://localhost:3000:

- Homepage: hero card has a small chart thumbnail under the summary. Deep-dive panel shows two exec-summary bullets with "…and 2 more findings." Latest articles cards each have a small chart thumbnail above the title.
- Article page (`/articles/city-budget-transit-schools-renters`): Key findings card with 4 bullets, then a bar chart titled "Exhibit 1. Proposed transit-service hours…", then the body prose, then the inline blocks (pull-quote / explainer), then Source notes section with 3 entries (2 linked), then a "Was this clear?" widget.
- Click "Yes" on the clarity widget → "Thanks — noted." Reload → widget hidden.
- Other articles: same structure with line/area/dot charts.

- [ ] **Step 3: OG smoke tests**

While dev server still running:

- `http://localhost:3000/opengraph-image` → 1200×630 PNG.
- `http://localhost:3000/articles/city-budget-transit-schools-renters/opengraph-image` → kicker = "Civic Life".
- `http://localhost:3000/topics/civic-life/opengraph-image` → kicker = "Topic".
- `http://localhost:3000/authors/maya-chen/opengraph-image` → kicker = "Author".

- [ ] **Step 4: Feedback rate-limit smoke**

```bash
curl -X POST http://localhost:3000/api/feedback/clarity \
  -H "Content-Type: application/json" \
  -d '{"slug":"city-budget-transit-schools-renters","clarity":"yes"}'
```

Expected: `{"ok":true}` first call, `{"error":"rate-limited"}` (HTTP 429) on second within 60s.

(If Strapi isn't configured locally, first call returns `{"error":"feedback-disabled"}` HTTP 503. That's the documented degraded behavior; skip the rate-limit check.)

- [ ] **Step 5: Git status check**

```bash
git status
git log --oneline -30
```

Expected: working tree clean, 27 commits since Task 1 of this plan.

---

## After Phase B

Phase B is complete. Visible to readers: the McKinsey article structure, the homepage exhibit thumbnails, the deep-dive exec-summary preview, OG images on every shareable surface, and the unobtrusive clarity feedback widget. Phase C (soft sections: music/arts topic, `format: 'light'` exemption, podcast recommendations) is the next plan and adds the gentler editorial corner.
