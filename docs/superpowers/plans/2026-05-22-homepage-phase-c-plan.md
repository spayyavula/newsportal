# Soft Sections — Music/Arts Topic + Podcast Recommendations (Spec 1, Phase C) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a calmer editorial corner — a `music-arts` topic with curatorial framing, and a curated `podcast-recommendation` content type surfaced on topic landing pages and (optionally) in the Daily Brief. Soft-format articles already work via the `format` field shipped in Phase B; this plan extends the surface around them.

**Architecture:** One new topic seed (frontend fallback + a manual Strapi seed step). One new Strapi content type (`podcast-recommendation`). One new optional relation on the `daily-brief` type (`recommendedListen`). One new `<PodcastRecommendation>` component. Topic-page sidebar gains a "Recommended listening" block. `<DailyBriefPanel>` gains an optional 4th slot.

**Tech Stack:** Same as Phase A/B (Next.js App Router, Strapi 5, TypeScript). No new external dependencies.

**Testing posture:** Build → manually verify → commit.

**Depends on:** Spec 1 Phase A (`daily-brief` content type and `<DailyBriefPanel>`) and Phase B (`format` field on articles, though only `light` articles are *content*; the field already exists at schema level).

---

## File structure

**Strapi (new files):**

- `strapi/src/api/podcast-recommendation/content-types/podcast-recommendation/schema.json`
- `strapi/src/api/podcast-recommendation/controllers/podcast-recommendation.ts`
- `strapi/src/api/podcast-recommendation/routes/podcast-recommendation.ts`
- `strapi/src/api/podcast-recommendation/services/podcast-recommendation.ts`

**Strapi (modified):**

- `strapi/src/api/daily-brief/content-types/daily-brief/schema.json` — add optional `recommendedListen` relation.

**Frontend (new files):**

- `src/components/podcast-recommendation.tsx`

**Frontend (modified):**

- `src/content/site.ts` — add `PodcastRecommendation` type, `music-arts` topic entry, optional `recommendedListen` on `DailyBrief` type, `fallbackPodcastRecommendations`, update `fallbackDailyBrief` to demonstrate the optional slot.
- `src/lib/cms.ts` — add `getPodcastRecommendationsByTopic`, update `getDailyBrief` to populate `recommendedListen`, add `mapPodcastRecommendation`.
- `src/components/daily-brief-panel.tsx` — render the optional 4th brief block.
- `src/app/topics/[slug]/page.tsx` — add the sidebar.
- `src/app/globals.css` — styles.

---

## Task 1: Add the `podcast-recommendation` Strapi content type

**Files:**
- Create: `strapi/src/api/podcast-recommendation/content-types/podcast-recommendation/schema.json`
- Create: `strapi/src/api/podcast-recommendation/controllers/podcast-recommendation.ts`
- Create: `strapi/src/api/podcast-recommendation/routes/podcast-recommendation.ts`
- Create: `strapi/src/api/podcast-recommendation/services/podcast-recommendation.ts`

- [ ] **Step 1: Create schema**

`strapi/src/api/podcast-recommendation/content-types/podcast-recommendation/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "podcast_recommendations",
  "info": {
    "singularName": "podcast-recommendation",
    "pluralName": "podcast-recommendations",
    "displayName": "Podcast Recommendation",
    "description": "Curated external podcast pick, surfaced on topic pages and optionally in the Daily Brief"
  },
  "options": {
    "draftAndPublish": true
  },
  "attributes": {
    "showName": {
      "type": "string",
      "required": true
    },
    "episodeTitle": {
      "type": "string",
      "required": true
    },
    "host": {
      "type": "string"
    },
    "durationMinutes": {
      "type": "integer",
      "required": true
    },
    "summary": {
      "type": "text",
      "required": true
    },
    "listenUrl": {
      "type": "string",
      "required": true
    },
    "topic": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::topic.topic"
    },
    "publishedOn": {
      "type": "datetime",
      "required": true
    }
  }
}
```

- [ ] **Step 2: Create controller / router / service**

`strapi/src/api/podcast-recommendation/controllers/podcast-recommendation.ts`:

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::podcast-recommendation.podcast-recommendation');
```

`strapi/src/api/podcast-recommendation/routes/podcast-recommendation.ts`:

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::podcast-recommendation.podcast-recommendation');
```

`strapi/src/api/podcast-recommendation/services/podcast-recommendation.ts`:

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::podcast-recommendation.podcast-recommendation');
```

- [ ] **Step 3: Build Strapi**

```bash
cd strapi && npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add strapi/src/api/podcast-recommendation/
git commit -m "Add podcast-recommendation Strapi content type"
```

---

## Task 2: Add `recommendedListen` relation to `daily-brief` schema

**Files:**
- Modify: `strapi/src/api/daily-brief/content-types/daily-brief/schema.json`

- [ ] **Step 1: Add the optional relation**

Inside the `attributes` block of `strapi/src/api/daily-brief/content-types/daily-brief/schema.json`, after the existing `explainer` attribute, add:

```json
"recommendedListen": {
  "type": "relation",
  "relation": "oneToOne",
  "target": "api::podcast-recommendation.podcast-recommendation"
}
```

(No `required: true`. Editorial choice per brief whether to include a listening pick.)

- [ ] **Step 2: Build Strapi**

```bash
cd strapi && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add strapi/src/api/daily-brief/content-types/daily-brief/schema.json
git commit -m "Add optional recommendedListen relation to daily-brief schema"
```

---

## Task 3: Add the `music-arts` topic to fallback `topicCards`

**Files:**
- Modify: `src/content/site.ts`

- [ ] **Step 1: Add the new topic entry**

Append the new topic to the `topicCards` array, after the last existing entry (`elections-policy`). The full entry:

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
},
```

Important: this lives inside the `topicCards: Topic[]` array literal — keep the trailing comma.

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: build succeeds. The `/topics` index will now include the new topic.

- [ ] **Step 3: Commit**

```bash
git add src/content/site.ts
git commit -m "Add music-arts topic to fallback topicCards"
```

---

## Task 4: Add `PodcastRecommendation` type and update `DailyBrief`

**Files:**
- Modify: `src/content/site.ts`

- [ ] **Step 1: Add the type**

Near the existing `BriefItem` and `DailyBrief` types in `src/content/site.ts`, add:

```ts
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
```

- [ ] **Step 2: Extend the `DailyBrief` type**

Find the `DailyBrief` type and add an optional `recommendedListen` field:

```ts
export type DailyBrief = {
  publishedOn: string;
  headline: string;
  developments: BriefItem[];
  factCheck: BriefItem;
  explainer: BriefItem;
  recommendedListen?: PodcastRecommendation;
};
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: build succeeds. Existing fallbackDailyBrief still typechecks because the new field is optional.

- [ ] **Step 4: Commit**

```bash
git add src/content/site.ts
git commit -m "Add PodcastRecommendation type and extend DailyBrief with optional recommendedListen"
```

---

## Task 5: Add `fallbackPodcastRecommendations` and exercise the optional brief slot

**Files:**
- Modify: `src/content/site.ts`

- [ ] **Step 1: Define the fallback list**

After the `fallbackDailyBrief` export, add:

```ts
export const fallbackPodcastRecommendations: PodcastRecommendation[] = [
  {
    showName: "Council Adjourns",
    episodeTitle: "How off-peak transit service gets quietly trimmed",
    host: "Maya Ortiz",
    durationMinutes: 34,
    summary:
      "A budget reporter walks through how 'maintained' service hours can still degrade frequency on lines with irregular ridership. Pairs with the city budget reporting on Common Ground.",
    listenUrl: "https://example.org/podcasts/council-adjourns/off-peak-transit",
    topicSlug: "civic-life",
    publishedOn: "2026-04-12T09:00:00.000Z",
  },
  {
    showName: "Grid Practical",
    episodeTitle: "Transformer replacement timelines, explained",
    host: "Ravi Annapurna",
    durationMinutes: 27,
    summary:
      "Three engineers describe what a real capital plan looks like inside a utility — and how to read one as an outside observer.",
    listenUrl: "https://example.org/podcasts/grid-practical/transformers",
    topicSlug: "climate-science",
    publishedOn: "2026-04-09T12:00:00.000Z",
  },
  {
    showName: "Slow Listening",
    episodeTitle: "Three quiet piano works for an unhurried afternoon",
    durationMinutes: 41,
    summary:
      "A short, melodic set with notes on each piece — no host commentary between tracks, just the music.",
    listenUrl: "https://example.org/podcasts/slow-listening/three-quiet-piano-works",
    topicSlug: "music-arts",
    publishedOn: "2026-04-11T07:00:00.000Z",
  },
];
```

- [ ] **Step 2: Add a `recommendedListen` to `fallbackDailyBrief`**

Update `fallbackDailyBrief` to demonstrate the optional 4th block. Add this field after `explainer`:

```ts
recommendedListen: {
  showName: "Council Adjourns",
  episodeTitle: "How off-peak transit service gets quietly trimmed",
  host: "Maya Ortiz",
  durationMinutes: 34,
  summary:
    "A budget reporter walks through how 'maintained' service hours can still degrade frequency on lines with irregular ridership.",
  listenUrl: "https://example.org/podcasts/council-adjourns/off-peak-transit",
  topicSlug: "civic-life",
  publishedOn: "2026-04-12T09:00:00.000Z",
},
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/content/site.ts
git commit -m "Add fallback podcast recommendations; exercise daily-brief recommendedListen slot"
```

---

## Task 6: CMS lib — `mapPodcastRecommendation` and `getPodcastRecommendationsByTopic`

**Files:**
- Modify: `src/lib/cms.ts`

- [ ] **Step 1: Update imports**

The type imports at the top of `src/lib/cms.ts` need the new types:

```ts
import {
  articles as fallbackArticles,
  authors as fallbackAuthors,
  fallbackDailyBrief,
  fallbackPodcastRecommendations,
  topicCards as fallbackTopics,
} from "@/content/site";
import type {
  Article,
  ArticleBlock,
  Author,
  BriefItem,
  ChartExhibit,
  DailyBrief,
  PodcastRecommendation,
  SourceNote,
  Topic,
} from "@/content/site";
```

- [ ] **Step 2: Add `mapPodcastRecommendation` helper**

Near the other map helpers, add:

```ts
function mapPodcastRecommendation(entity: StrapiEntity | null): PodcastRecommendation | null {
  if (!entity) return null;

  const showName = entity.showName;
  const episodeTitle = entity.episodeTitle;
  const durationMinutes = entity.durationMinutes;
  const summary = entity.summary;
  const listenUrl = entity.listenUrl;
  const publishedOn = entity.publishedOn;
  const topicEntity = unwrapRelation(entity.topic);
  const topicSlug =
    topicEntity && typeof topicEntity.slug === "string" ? topicEntity.slug : null;

  if (
    typeof showName !== "string" ||
    typeof episodeTitle !== "string" ||
    typeof durationMinutes !== "number" ||
    typeof summary !== "string" ||
    typeof listenUrl !== "string" ||
    typeof publishedOn !== "string" ||
    !topicSlug
  ) {
    return null;
  }

  return {
    showName,
    episodeTitle,
    host: typeof entity.host === "string" ? entity.host : undefined,
    durationMinutes,
    summary,
    listenUrl,
    topicSlug,
    publishedOn,
  };
}
```

- [ ] **Step 3: Add `getPodcastRecommendationsByTopic`**

After the existing topic-lookup functions, add:

```ts
export async function getPodcastRecommendationsByTopic(
  slug: string,
  limit = 3,
  options: QueryOptions = {},
): Promise<PodcastRecommendation[]> {
  const response = await fetchStrapi<StrapiListResponse<StrapiEntity>>(
    `/api/podcast-recommendations?filters[topic][slug][$eq]=${encodeURIComponent(slug)}&sort[0]=publishedOn:desc&populate=topic&pagination[limit]=${limit}&status=${options.preview ? "draft" : "published"}`,
    options,
  );

  const fromStrapi = (response?.data ?? [])
    .map(mapPodcastRecommendation)
    .filter((item): item is PodcastRecommendation => Boolean(item));

  if (fromStrapi.length > 0) {
    return fromStrapi;
  }

  return fallbackPodcastRecommendations
    .filter((rec) => rec.topicSlug === slug)
    .slice(0, limit);
}
```

- [ ] **Step 4: Update `getDailyBrief` to populate `recommendedListen`**

In `getDailyBrief`, the populate string needs to include the new relation. Change the `populate=...` portion of the query to:

```
populate[developments][populate]=articleLink&populate[factCheck][populate]=articleLink&populate[explainer][populate]=articleLink&populate[recommendedListen][populate]=topic
```

Then in `mapDailyBrief`, add the optional field:

```ts
const recommendedListenEntity = unwrapRelation(entity.recommendedListen);
const recommendedListen = mapPodcastRecommendation(recommendedListenEntity);

return {
  publishedOn,
  headline,
  developments,
  factCheck,
  explainer,
  recommendedListen: recommendedListen ?? undefined,
};
```

- [ ] **Step 5: Build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/lib/cms.ts
git commit -m "Add podcast-recommendation mapping, lookup by topic, daily-brief integration"
```

---

## Task 7: Create the `<PodcastRecommendation>` component

**Files:**
- Create: `src/components/podcast-recommendation.tsx`

- [ ] **Step 1: Write the component**

```tsx
import type { PodcastRecommendation } from "@/content/site";

type PodcastRecommendationProps = {
  podcast: PodcastRecommendation;
  variant?: "card" | "brief";
};

export function PodcastRecommendationCard({
  podcast,
  variant = "card",
}: PodcastRecommendationProps) {
  return (
    <article className={`podcast-recommendation podcast-recommendation-${variant}`}>
      <p className="podcast-recommendation-show">{podcast.showName}</p>
      <h3 className="podcast-recommendation-episode">{podcast.episodeTitle}</h3>
      {podcast.host ? (
        <p className="podcast-recommendation-host">Hosted by {podcast.host}</p>
      ) : null}
      <p className="podcast-recommendation-meta">{podcast.durationMinutes} min listen</p>
      <p className="podcast-recommendation-summary">{podcast.summary}</p>
      <a
        className="button-secondary podcast-recommendation-listen"
        href={podcast.listenUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        Listen
      </a>
    </article>
  );
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/podcast-recommendation.tsx
git commit -m "Add PodcastRecommendationCard component"
```

---

## Task 8: Update `<DailyBriefPanel>` to render the optional 4th block

**Files:**
- Modify: `src/components/daily-brief-panel.tsx`

- [ ] **Step 1: Update the component**

The current component (from Phase A Task 8) renders three sections. Add the optional 4th. Replace the file contents with:

```tsx
import Link from "next/link";
import { PodcastRecommendationCard } from "@/components/podcast-recommendation";
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

      {brief.recommendedListen ? (
        <>
          <p className="daily-brief-section-label">One podcast worth this week</p>
          <PodcastRecommendationCard
            podcast={brief.recommendedListen}
            variant="brief"
          />
        </>
      ) : null}
    </aside>
  );
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/daily-brief-panel.tsx
git commit -m "Render optional recommendedListen block in DailyBriefPanel"
```

---

## Task 9: Add "Recommended listening" sidebar on topic pages

**Files:**
- Modify: `src/app/topics/[slug]/page.tsx`

- [ ] **Step 1: Read the current file to understand layout**

```bash
cat src/app/topics/[slug]/page.tsx
```

(Skim — you'll be inserting a sidebar near the topic detail block. The exact JSX position depends on the current layout, but it should sit alongside or below the topic header and above the articles list.)

- [ ] **Step 2: Add imports**

At the top of `src/app/topics/[slug]/page.tsx`, add:

```tsx
import { PodcastRecommendationCard } from "@/components/podcast-recommendation";
import { getPodcastRecommendationsByTopic } from "@/lib/cms";
```

- [ ] **Step 3: Fetch the recommendations**

In the topic page function (whatever its name is — likely `TopicPage`), add a fetch alongside the existing topic data load. For example, if the page currently does:

```tsx
const topic = await getTopicBySlug(slug, { preview: isEnabled });
const articles = await getArticlesByTopic(slug, { preview: isEnabled });
```

…add:

```tsx
const podcastRecs = await getPodcastRecommendationsByTopic(slug, 3, { preview: isEnabled });
```

- [ ] **Step 4: Render the sidebar**

Insert the sidebar JSX near the topic header (recommend immediately before or after the existing articles grid — wherever makes sense given the current layout). The JSX:

```tsx
{podcastRecs.length > 0 ? (
  <section className="page-section topic-podcast-sidebar">
    <div className="section-heading">
      <p className="eyebrow">Recommended listening</p>
      <h2>Curated audio for this beat</h2>
    </div>
    <div className="card-grid card-grid-three compact-grid">
      {podcastRecs.map((podcast) => (
        <PodcastRecommendationCard
          key={`${podcast.showName}-${podcast.episodeTitle}`}
          podcast={podcast}
          variant="card"
        />
      ))}
    </div>
  </section>
) : null}
```

(Place the JSX in the return statement at the position that feels right structurally — after the topic detail header, before related articles is a sensible spot.)

- [ ] **Step 5: Build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/app/topics/[slug]/page.tsx
git commit -m "Add 'Recommended listening' sidebar to topic pages"
```

---

## Task 10: Add CSS for the podcast surface

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Append the styles**

```css
/* ===== Podcast recommendation ===== */

.podcast-recommendation {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 1rem 1.1rem;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 4px;
}

.podcast-recommendation-show {
  margin: 0;
  font-family: var(--font-franklin), -apple-system, "Segoe UI", sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #666;
}

.podcast-recommendation-episode {
  margin: 0;
  font-family: var(--font-newsreader), Georgia, serif;
  font-weight: 500;
  font-size: 1.1rem;
  line-height: 1.25;
  color: #111;
}

.podcast-recommendation-host {
  margin: 0;
  font-size: 0.85rem;
  color: #555;
}

.podcast-recommendation-meta {
  margin: 0;
  font-size: 0.8rem;
  color: #888;
}

.podcast-recommendation-summary {
  margin: 0.3rem 0 0.5rem;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #333;
}

.podcast-recommendation-listen {
  align-self: flex-start;
}

.podcast-recommendation-brief {
  margin-top: 0.5rem;
  padding: 0.8rem 0.9rem;
  background: #fbf9f4;
}

.topic-podcast-sidebar .section-heading {
  margin-bottom: 1rem;
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "Add CSS for PodcastRecommendation card and topic-page sidebar"
```

---

## Task 11: Seed the `music-arts` topic in Strapi (manual, one-time)

**Files:**
- None modified — manual deploy step documented here.

- [ ] **Step 1: Document the seed step**

This is a one-time manual step performed after the next Strapi deploy. The frontend already renders the music-arts topic from its fallback, so production won't break if this is skipped — but the topic admin will be empty.

After deploy, in Strapi admin:

1. Content Manager → Topic → Create new entry.
2. Fill in the fields from `src/content/site.ts`'s `music-arts` entry: name "Music and Arts", slug `music-arts` (auto from name), kicker "A quieter corner", and so on.
3. Save and Publish.

- [ ] **Step 2: Add a checklist line in docs/google-cloud.md**

Open `docs/google-cloud.md` and find Section 12 (Post-Deploy Checklist) at line 308. Add to the checklist:

```markdown
6. After this deploy, seed the `music-arts` Topic in Strapi admin (one-time).
```

- [ ] **Step 3: Commit**

```bash
git add docs/google-cloud.md
git commit -m "Document one-time music-arts topic seed in post-deploy checklist"
```

---

## Task 12: End-to-end manual verification

**Files:**
- None modified — verification only.

- [ ] **Step 1: Builds clean**

```bash
npm run build && (cd strapi && npm run build)
```

- [ ] **Step 2: Dev server checks (no Strapi)**

```bash
npm run dev
```

Verify on http://localhost:3000:

- Homepage Daily Brief panel now shows a 4th block titled "One podcast worth this week" with the "Council Adjourns" episode.
- http://localhost:3000/topics → music-arts topic appears in the grid with kicker "A quieter corner".
- http://localhost:3000/topics/civic-life → "Recommended listening" sidebar shows the "Council Adjourns" podcast.
- http://localhost:3000/topics/climate-science → sidebar shows "Grid Practical".
- http://localhost:3000/topics/music-arts → topic detail page renders with "Slow Listening" podcast in the sidebar.
- http://localhost:3000/topics/education → no sidebar (no fallback recs for this topic). The section is omitted, not rendered empty.

- [ ] **Step 3: Strapi smoke (optional, if local Strapi running)**

In Strapi admin:

1. Create a `Podcast Recommendation` tied to the `civic-life` topic with any test data. Publish.
2. Reload `/topics/civic-life`. The Strapi-published podcast should appear instead of (or alongside, depending on limit) the fallback.

3. Edit a `Daily Brief` and set `recommendedListen` to that podcast. Save & Publish.
4. Reload `/`. The brief panel's 4th block should now reflect the Strapi-set podcast.

- [ ] **Step 4: Git status**

```bash
git status
git log --oneline -15
```

Expected: working tree clean, 11 commits from this plan.

---

## After Phase C

Phase C ships the calmer corner. Spec 1 is now fully implemented:

- Phase A: journalism-first homepage, dedupe, rendered Daily Brief.
- Phase B: McKinsey article structure, OG images, clarity feedback.
- Phase C: music-arts topic, podcast recommendations on topic pages and in the brief.

`format: 'light'` articles (per Phase B's article schema) can now be authored in Strapi without breaking the McKinsey rendering — music-arts pieces use this format by default. Spec 2 (AI drafter) and Spec 3 (community contributions) are independent specs with their own plans.
