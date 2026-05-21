# Design: Community contributions with AI critique

**Date:** 2026-05-22
**Status:** Draft — awaiting review
**Driver:** Build a community surface where vetted reader-contributors publish short essays, with AI helping them write better before submission. Goals: a sustainable engagement model that doesn't fight the brand, and a place for thoughtful perspectives that sit alongside (but visibly outside) staff reporting.

---

## 1. Scope

In scope:

- Application + approval flow: logged-in readers apply for a `contributor` role; editors review and grant.
- Approved contributors submit drafts through an in-site composer at `/voices/compose`.
- An async "Critique my draft" button that calls OpenAI and returns a written editorial review (clarity, sourcing, gaps, tone, length). Contributors can re-run the critique unlimited times before submitting.
- Submitted drafts go to Strapi as `format: 'light'` articles with a distinct `sourceType: 'community'` flag. Editors review and publish (or reject) from Strapi admin.
- Published community pieces live at `/voices` and at `/voices/by/<slug>`. They are excluded from `/articles`, the homepage Latest Articles grid, and the Daily Brief.
- A small "From the community" rail on relevant topic pages, surfacing recent contributed pieces tied to that topic.

Explicitly out of scope:

- Synchronous Grammarly-style inline suggestions. Async critique only.
- Source-verification helpers (URL fetching, broken-link detection). Editor verifies sources at review time.
- Comments, reactions, or other reader-on-reader interaction. Contributions go reader → editor → site, not reader → reader.
- Paid contribution tiers, contributor compensation, or any monetization. v1 is unpaid community.
- AI auto-publishing. Every contributed piece goes through human editorial review.
- A contributor "reputation" or rating system.

---

## 2. Architecture

Five small pieces:

1. **Strapi schema additions:** new `contributor-application` content type, new `sourceType` enum field on `article`, new `bio` field on `user` (Strapi's users-permissions plugin), and a new `contributor` Strapi role wired to article create-as-draft permissions.
2. **Application flow:** `/voices/apply` page (logged-in only) → `POST /api/voices/apply` → row in `contributor-application` (status pending). Editor reviews in Strapi admin and grants the `contributor` role manually for v1.
3. **Composer:** `/voices/compose` page (contributor-role only) → React form (title, body, optional topic, optional source URLs) → "Critique my draft" button → "Submit for review" button.
4. **AI critique endpoint:** `POST /api/voices/critique`. Authed by session. Server-side calls OpenAI with the editorial-standards block + a critique-specific contract. Returns the AI's written review as plain text.
5. **Public surfaces:** `/voices` (index, sorted newest first), `/voices/[slug]` (individual contributed article — same `<ExecutiveSummary>` and `<Exhibit>` components are unused; community pieces are prose-only by default), `/voices/by/[slug]` (contributor profile + their pieces).

No new external services. Reuses Strapi auth, OpenAI client from [src/lib/assistant-llm.ts](src/lib/assistant-llm.ts), existing article rendering infrastructure.

---

## 3. Strapi changes

### 3.1 New content type: `contributor-application`

Location: `strapi/src/api/contributor-application/`.

| Field | Type | Constraints |
|---|---|---|
| `user` | relation to `users-permissions.user` | Required. |
| `email` | string | Required. Denormalised from user at submission time. |
| `displayName` | string | Required. |
| `pitch` | text | Required. 100–1500 chars: "What do you want to write about, and why is your perspective useful?" |
| `priorWriting` | text | Optional. URLs or notes about past writing. |
| `status` | enum | `pending` \| `approved` \| `rejected`. Default `pending`. |
| `reviewNote` | text | Optional. Editor's note when approving/rejecting. |
| `submittedAt` | datetime | Server-generated. |
| `reviewedAt` | datetime | Server-set when status changes. |

Create permission: authenticated reader. Read/update: admin role only.

### 3.2 Article schema additions

Additive. v1 community pieces are validated only at the API/runtime layer (matching Spec 1 §3.6's soft-enforcement pattern):

| New field | Type | Constraints |
|---|---|---|
| `sourceType` | enum | `staff` \| `community`. Default `staff`. Drives surface filtering and visual treatment. |
| `contributorByline` | string | Optional. Used when `sourceType === 'community'` and the contributor has no canonical author entry. |

Spec 1's existing `format: 'data-led' | 'light'` covers the rendering split. Community pieces default to `format: 'light'`. `executiveSummary`, `leadExhibit`, `sourceNotes` remain optional for them.

### 3.3 Strapi role: `contributor`

New role in users-permissions with these grants:

- `article.create` (draft only; the controller enforces `publishedAt: null` on creation).
- `article.find` and `article.findOne` filtered to `own` (contributors see their own drafts).
- `contributor-application.create`.

No `update` or `delete` on articles for v1 — once a draft is submitted, only an editor can touch it. (We can relax to "edit own draft until submitted" later if needed.)

### 3.4 User bio

Add `bio` (text, optional, max 600 chars) to the users-permissions user. Drives `/voices/by/[slug]` profile pages.

---

## 4. Application flow

### 4.1 `/voices/apply`

Logged-in readers only. Page renders:

- A short editorial statement: who we accept, what we publish, that approval is at editor discretion.
- Form: `displayName`, `pitch` (textarea), `priorWriting` (textarea).
- "Submit application" button → `POST /api/voices/apply`.

If the reader is already an approved contributor, the page redirects to `/voices/compose`. If they have a pending application, the page shows "Your application is being reviewed."

### 4.2 `POST /api/voices/apply`

Validates payload, rate-limits to 1 application per user per 30 days (server-side check on the existing `contributor-application` table), writes the row, returns `{ status: 'pending' }`.

### 4.3 Editor approval

Manual for v1. Editor opens Strapi admin, filters applications by `status: pending`, reads the pitch, and either:

- Sets `status: approved`, attaches a `reviewNote`, and manually changes the user's role to `contributor` (Strapi admin UI for users-permissions).
- Sets `status: rejected`, attaches a `reviewNote`.

The applicant is not auto-emailed in v1 (no Resend integration here — same posture as Spec 2). The composer page lights up for approved contributors the next time they log in. We can add notifications later.

---

## 5. Composer (`/voices/compose`)

Contributor-role only. Other roles get redirected to `/voices/apply` (or the apply page's pending state).

### 5.1 Form fields

- `title` — string, 10–200 chars.
- `body` — textarea, 400–1200 words. (Validated client-side as a soft check; server enforces.)
- `topic` — optional dropdown of existing topics (`music-arts` allowed; all others allowed). Defaults to no topic.
- `sourceUrls` — optional list of URLs (one per line). Stored in the `sourceNotes` field if provided.
- "Critique my draft" button.
- "Submit for review" button.
- Save status indicator. The form autosaves to `localStorage` keyed on the user ID so a refresh doesn't lose work.

### 5.2 Critique flow

Clicking "Critique my draft" calls `POST /api/voices/critique` with the current form contents. Disables the button while the request is in flight. On response:

- Renders the AI critique as a panel below the form (markdown-rendered if the model returns markdown; plain prose otherwise).
- A "Run another critique" button reappears so the contributor can iterate.

No critique history is stored. Each click is a fresh call; the previous critique is replaced in the UI. Keeps the contributor focused on the *current* draft.

### 5.3 Submit flow

Clicking "Submit for review" calls `POST /api/voices/submit`. Server validates:

- Title, body length, ownership.
- Body word count is within 400–1200.
- If `sourceUrls` is present, every URL parses as a valid URL.

Server posts to Strapi as a draft with:

```json
{
  "title": "...",
  "slug": "voices-{user-id}-{yyyymmdd-hhmm}",
  "summary": <first 240 chars of body, stripped>,
  "body": "...",
  "sourceNotes": [{ "text": "...", "url": "..." }, ...],
  "storyType": "opinion",
  "format": "light",
  "sourceType": "community",
  "contributorByline": "<user.displayName>",
  "topic": <topic-id or null>,
  "author": null,
  "publishedAt": null
}
```

`storyType: 'opinion'` because community pieces are first-person/perspective by default. The contributor clears `localStorage` autosave on success. UI shows: "Submitted. An editor will review your piece."

---

## 6. AI critique endpoint

`POST /api/voices/critique` at `src/app/api/voices/critique/route.ts`. Authed by session.

System prompt = `EDITORIAL_STANDARDS_BLOCK` from [src/lib/assistant-llm.ts:34-111](src/lib/assistant-llm.ts#L34-L111) + a critique-specific contract:

> "You are an editor coaching a community contributor. Read the draft they provide. Return a short written critique (250–500 words, plain prose, no bullet list unless the contributor asked for one). Cover: where the argument is clear and where it isn't; which claims need a source; which sentences feel padded or rhetorical; whether the length is right for the substance; what one revision would most improve the piece. Be specific and kind — the goal is to help them write better, not to gatekeep. Never rewrite the draft for them. Never say the draft is good if it isn't."

Temperature 0.4. Prompt cache key `common-ground-voices-critique:v1` so the system prompt caches across critique calls.

**Cost cap:** rate-limit per contributor to 20 critique calls per day (in-memory LRU keyed by user ID + day). Adjust later if the cap turns out to be tight.

**Response shape:** `{ critique: string, model: string }`. Errors return `{ error: string }` with a 4xx/5xx status; the composer shows a brief error and re-enables the button.

---

## 7. Public surfaces

### 7.1 `/voices` (index)

New page. Lists published community pieces, newest first. Each card: kicker "Reader contribution", title, contributor byline, optional topic, summary, read time. Visually distinct from `<ArticleCard>` — slightly understated, narrower column.

Page header explains the surface: "Voices is where vetted readers publish first-person essays. These are individual perspectives, not Common Ground reporting."

### 7.2 `/voices/[slug]`

Individual community article page. Uses a stripped-down version of the existing article page renderer: header (kicker, title, contributor byline, read time), prose body, source notes if any. No executive summary, no lead exhibit, no "From the same author" rail (community contributors don't get cross-promoted within the site). A footer note: "This piece reflects the contributor's views, not the Common Ground newsroom's reporting."

### 7.3 `/voices/by/[slug]`

Contributor profile page. Avatar (initials if no upload), display name, bio (from the user record), list of their published contributions. No followers, no follow buttons, no message buttons — this isn't a social product.

### 7.4 Navigation

Add "Voices" to the site nav in [src/content/site.ts:66](src/content/site.ts#L66) between "Articles" and "Authors". Add a small "From the community" rail on topic pages showing up to 3 recent community pieces tied to that topic, but only if any exist (no empty rail).

### 7.5 Exclusions from existing surfaces

Community pieces (`sourceType: 'community'`) are filtered out of:

- `/` Latest Articles grid (the homepage anchor + deep-dive + 3 latest are all staff-only).
- `/articles` index (staff-only).
- Daily Brief developments / fact-check / explainer slots.
- The Featured Reporting / Deep-Dive panel.
- The Assistant's article recommendations.

The CMS lib `getArticles` and friends gain an optional `includeCommunity: boolean` arg, defaulting to `false` everywhere except the new `/voices` pages and the topic-page community rail.

---

## 8. Fallback behavior

Same posture as Spec 1: if Strapi is unconfigured, `/voices` renders empty-state copy ("No community contributions yet — be the first to apply"), `/voices/apply` and `/voices/compose` short-circuit to a "feature unavailable" page. No fallback fake data here — community-by-fake-content would be misleading.

---

## 9. Testing

- Application flow: apply with valid payload → row exists in Strapi with `status: pending`. Apply twice within 30 days → second call returns 429.
- Composer auth: hit `/voices/compose` as a logged-out reader → redirected to login. Hit as logged-in non-contributor → redirected to `/voices/apply`. Hit as contributor → page loads.
- Critique loop: write a draft, click "Critique my draft" → AI critique panel appears. Click again → previous critique replaced. Hit 21 times in a day → 429.
- Submit flow: submit valid draft → article appears in Strapi with `publishedAt: null`, `sourceType: 'community'`, `format: 'light'`, `storyType: 'opinion'`.
- Exclusion smoke: publish a community piece (set `publishedAt`), reload `/` and `/articles` → community piece does not appear. Reload `/voices` and `/voices/by/<slug>` → it appears.
- Topic-rail smoke: publish a community piece tied to `civic-life` → its `/topics/civic-life` page shows the "From the community" rail.

No new automated test harness — same posture as Specs 1 and 2.

---

## 10. Dependencies and sequencing

- Independent of Spec 2 (AI drafter).
- Depends on Spec 1 Phase B for the `format` field. Spec 1 Phase C is helpful (the `music-arts` topic) but not strictly required — community pieces in other topics work fine without `music-arts`.
- Realistic sequencing: Spec 1 Phase B → Spec 3.

---

## 11. Risks and trade-offs

- **Editorial load.** Even with the application gate, every approved contributor's draft is editor work. Cap contributors to a manageable cohort in v1 (10–15) until you've built the review rhythm.
- **Spam through application.** The 30-day rate limit on `/api/voices/apply` is per user, so a determined attacker can create reader accounts in bulk. Existing reader registration at [src/app/api/auth/register/route.ts](src/app/api/auth/register/route.ts) is the upstream choke point — that needs CAPTCHA or email verification before launch if it doesn't already.
- **Brand confusion if /voices visually blends with /articles.** Visual treatment must be deliberately distinct. The "Reader contribution" kicker and the footer disclaimer on every /voices/[slug] page are non-negotiable.
- **AI critique becomes the writer.** Mitigated by the system-prompt rule "Never rewrite the draft for them." Worth monitoring once contributors start using it — if the prompt drifts, lock it down further.
- **Contributor abandonment when applications are rejected silently.** The lack of email notification in v1 is a real UX gap. Acceptable for the first cohort while you're tuning; flag for a follow-on once a notification pipeline exists.

---

## 12. What this design refused to do (and why)

| Refused | Why |
|---|---|
| Inline real-time AI suggestions (Grammarly-style) | Async critique is enough for v1 and 10x cheaper to build and operate. |
| AI-fetching of submitted source URLs to flag broken links | A nice-to-have but the editor's manual review catches this. Defer until contributor volume justifies the automation. |
| Reader-on-reader interaction (comments, reactions, follows) | Out of brand. Voices is a publishing surface, not a social product. |
| Contributor reputation / scoring | Premature. With 10–15 contributors, the editor knows everyone by name. |
| Auto-publish after N approved pieces | Same. Manual review per piece in v1; revisit when there's a clear rhythm. |
| Email notifications for application status, draft submission, publication | Real gap, but Resend integration is out of scope here. Add as a follow-on. |
| Paid contribution tiers | Different product. |
