# Common Ground

Common Ground is a Next.js prototype for an advertisement-free, non-sensational news portal. The first version focuses on public-interest reporting, visible editorial standards, and a calm homepage that is not ordered by traffic spikes.

## Product direction

- No display advertising or sponsored placements in the editorial feed.
- Public editorial standards and a visible corrections page.
- Coverage organized around a few high-value beats instead of headline volume.
- Reader support as the default revenue model.

## Tech stack

- Next.js App Router with TypeScript
- Tailwind CSS v4 with custom global styling
- Strapi 5 CMS in the `strapi/` subfolder
- Frontend data client that reads from Strapi and falls back to local sample content
- Next Draft Mode route handlers for editor preview of draft articles
- Personalized news assistant that filters the article corpus using reader-saved interests and custom rules
- Strapi-backed reader accounts, saved presets, and recurring briefing rules

## Production deployment

- Production target: Google Cloud Run for both the frontend and Strapi CMS
- Production domain layout: `sanenews.net` for the frontend and `cms.sanenews.net` for Strapi
- Frontend container: [Dockerfile](Dockerfile)
- CMS container: [strapi/Dockerfile](strapi/Dockerfile)
- Cloud Run manifests: [deploy/cloud-run/frontend-service.yaml](deploy/cloud-run/frontend-service.yaml) and [deploy/cloud-run/cms-service.yaml](deploy/cloud-run/cms-service.yaml)
- Cloud Build configs: [deploy/cloud-build.frontend.yaml](deploy/cloud-build.frontend.yaml) and [deploy/cloud-build.cms.yaml](deploy/cloud-build.cms.yaml)
- PowerShell bootstrap: [scripts/setup-sanenews-gcp.ps1](scripts/setup-sanenews-gcp.ps1)
- Full deployment guide: [docs/google-cloud.md](docs/google-cloud.md)

## Pages included

- Home
- Articles index
- Article detail pages
- Authors index and author profile pages
- Topics
- Personalized assistant
- Topic detail pages
- About
- Editorial Standards
- Corrections
- Support

## Local development

```bash
npm install
npm run cms:dev
npm run dev
```

Then open `http://localhost:1337/admin` to create your first Strapi admin account, and `http://localhost:3000` for the frontend.

## Strapi setup

1. Start Strapi with `npm run cms:dev`.
2. Create the first admin user in the Strapi admin panel.
3. Create a read-only API token in Settings > API Tokens.
4. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_STRAPI_URL`, `STRAPI_API_TOKEN`, and `NEXT_PREVIEW_SECRET`.
5. Enable public registration in the Strapi users-permissions plugin if you want readers to create accounts from the frontend assistant.

The Strapi app includes seeded sample authors, topics, articles, and richer article body blocks on first boot.

For production on Google Cloud, configure Strapi to use PostgreSQL rather than SQLite. The repository now includes Postgres-ready Strapi config and Cloud SQL-oriented example environment values in [strapi/.env.example](strapi/.env.example).

## Personalized assistant

- Open `/assistant` to create a per-reader profile in the browser.
- Readers can save topics, story types, reading-time limits, minimum source counts, required keywords, blocked keywords, and delivery style.
- Signed-in readers can persist that profile to Strapi-backed accounts, save reusable filter presets, and create recurring briefing rules.
- The assistant route at `/api/assistant` always ranks the current Common Ground article set against those filters before generating a response.
- If `EXA_API_KEY` is configured, the assistant searches Exa for recent personalized news results that match the reader profile and prompt.
- If `OPENAI_API_KEY` is configured, the assistant upgrades to an LLM-written answer with article citations while still staying constrained to the ranked article shortlist.
- Without Exa or LLM keys, the assistant falls back to deterministic newsroom-generated brief text from the local or Strapi-backed article corpus.

## Reader accounts

- Frontend auth routes: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/session`
- Reader persistence routes: `/api/reader/profile`, `/api/reader/presets`, `/api/reader/rules`
- Strapi collections added for `reader-profile`, `filter-preset`, and `notification-rule`
- Session state is stored in an HTTP-only cookie and resolved against Strapi `users-permissions`

## Preview workflow

- Preview route: `/api/draft?secret=YOUR_SECRET&slug=/articles/YOUR_ARTICLE_SLUG`
- Exit preview: `/api/draft/disable`

Configure the article preview URL in Strapi to point at the frontend route above so editors can open draft articles directly in Next before publishing.

## Next build check

```bash
npm run build
npm run cms:build
```

## Suggested next product steps

1. Add Strapi components for article sections, pull quotes, and explainers.
2. Add author profile pages and topic landing pages with editorial notes.
3. Add a lightweight member signup flow and newsletter capture.
4. Add preview mode and draft review for editors.
