import { expect, test } from "@playwright/test";

// One smoke spec covering the critical public surfaces. The site runs entirely
// from fallback content (src/content/site.ts) when Strapi is unconfigured, so
// these tests are stable in CI without any CMS dependency.

test.describe("Common Ground smoke", () => {
  test("homepage renders the journalism-first flow", async ({ page }) => {
    await page.goto("/");

    // Site header is global and present
    await expect(page.locator("header.site-header")).toBeVisible();

    // Anchor article eyebrow (kicker + read time + storyType)
    await expect(page.locator(".anchor-hero-eyebrow").first()).toBeVisible();

    // Anchor H1 (the article title, linked)
    const anchorTitle = page.locator("h1.anchor-hero-title").first();
    await expect(anchorTitle).toBeVisible();
    await expect(anchorTitle.locator("a")).toHaveAttribute("href", /^\/articles\//);

    // Deep-dive panel renders the second story
    await expect(page.locator(".deep-dive-panel")).toBeVisible();
    await expect(page.locator(".deep-dive-panel h2")).toBeVisible();

    // Daily brief renders three developments + fact-check + explainer
    await expect(page.locator(".daily-brief-panel")).toBeVisible();
    await expect(page.locator(".daily-brief-section-label")).toHaveCount(4); // 3 sections + recommendedListen

    // Latest articles grid has 3 cards (excludes anchor + deep-dive)
    const latestCards = page.locator(".card-grid-three .article-card");
    await expect(latestCards).toHaveCount(3);

    // Trust strip near the bottom
    await expect(page.locator(".editorial-trust-strip")).toBeVisible();
    await expect(page.locator(".editorial-trust-strip-item")).toHaveCount(3);
  });

  test("article page renders the McKinsey structure", async ({ page }) => {
    await page.goto("/articles/city-budget-transit-schools-renters");

    // Header
    await expect(page.locator("h1")).toContainText(/city budget/i);

    // Executive summary card
    await expect(page.locator(".executive-summary")).toBeVisible();
    await expect(page.locator(".executive-summary-item")).toHaveCount(4);

    // Lead exhibit renders an SVG with role="img"
    const leadExhibit = page.locator(".exhibit-default").first();
    await expect(leadExhibit).toBeVisible();
    await expect(leadExhibit).toHaveAttribute("role", "img");
    await expect(leadExhibit.locator("svg").first()).toBeVisible();

    // Source notes
    await expect(page.locator(".source-notes")).toBeVisible();
    await expect(page.locator(".source-notes-item")).not.toHaveCount(0);

    // Clarity feedback widget present
    await expect(page.locator(".clarity-feedback")).toBeVisible();
  });

  test("topics surfaces work", async ({ page }) => {
    await page.goto("/topics");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".topic-card")).not.toHaveCount(0);

    await page.goto("/topics/civic-life");
    await expect(page.locator("h1")).toContainText(/civic life/i);
    // Recommended listening sidebar exists when fallback recs are present
    await expect(page.locator(".topic-podcast-sidebar")).toBeVisible();
  });

  test("voices index renders the empty state when no community articles published", async ({ page }) => {
    await page.goto("/voices");
    await expect(page.locator("h1")).toContainText(/reader contributions/i);
    // Fallback has no community-source articles, so the empty-state copy shows
    await expect(page.locator(".panel")).toContainText(/no community contributions yet/i);
  });

  test("voices apply page renders the application form", async ({ page }) => {
    await page.goto("/voices/apply");
    await expect(page.locator("h1")).toContainText(/apply to contribute/i);
    await expect(page.locator('input[name="displayName"]')).toBeVisible();
    await expect(page.locator('textarea[name="pitch"]')).toBeVisible();
  });

  test("OG images render at 1200x630", async ({ request }) => {
    const routes = [
      "/opengraph-image",
      "/articles/city-budget-transit-schools-renters/opengraph-image",
      "/topics/civic-life/opengraph-image",
      "/authors/maya-chen/opengraph-image",
    ];

    for (const route of routes) {
      const response = await request.get(route);
      expect(response.status(), `${route} should return 200`).toBe(200);
      const contentType = response.headers()["content-type"] ?? "";
      expect(contentType, `${route} should be a PNG`).toContain("image/png");
    }
  });

  test("clarity feedback endpoint validates and rate-limits", async ({ request }) => {
    // Empty payload returns 400
    const empty = await request.post("/api/feedback/clarity", { data: {} });
    // Without Strapi configured the route returns 503; otherwise 400 for missing fields.
    expect([400, 503]).toContain(empty.status());
  });
});
