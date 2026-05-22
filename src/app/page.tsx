import Link from "next/link";
import { draftMode } from "next/headers";
import { supportReasons, trustSignals } from "@/content/site";
import { ArticleCard } from "@/components/article-card";
import { Exhibit } from "@/components/exhibit";
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
      {/* 1. Anchor hero (NYT-style: SiteHeader already provides wordmark + date + nav globally) */}
      <section className="anchor-hero">
        <div className="anchor-hero-main">
          {anchorArticle ? (
            <>
              <p className="anchor-hero-eyebrow">
                <span className="anchor-hero-topic">{anchorArticle.topic.name}</span>
                <span className="anchor-hero-divider" aria-hidden="true">·</span>
                <span>{anchorArticle.readTime}</span>
                <span className="anchor-hero-divider" aria-hidden="true">·</span>
                <span className="anchor-hero-storytype">{anchorArticle.storyType}</span>
              </p>
              <h1 className="anchor-hero-title">
                <Link href={`/articles/${anchorArticle.slug}`}>{anchorArticle.title}</Link>
              </h1>
              <p className="anchor-hero-summary">{anchorArticle.summary}</p>
              {anchorArticle.format === "data-led" && anchorArticle.leadExhibit ? (
                <div className="anchor-hero-thumbnail">
                  <Exhibit exhibit={anchorArticle.leadExhibit} variant="compact" />
                </div>
              ) : null}
              <p className="anchor-hero-byline">
                By {anchorArticle.author.name}
              </p>
              <Link className="text-link anchor-hero-cta" href={`/articles/${anchorArticle.slug}`}>
                Read the full article →
              </Link>
            </>
          ) : (
            <>
              <p className="anchor-hero-eyebrow">Today</p>
              <h1 className="anchor-hero-title">CMS article feed is not configured yet.</h1>
              <p className="anchor-hero-summary">
                Set NEXT_PUBLIC_STRAPI_URL and STRAPI_API_TOKEN to load live articles from
                Strapi. Until then, the portal uses its local editorial fallback.
              </p>
            </>
          )}
        </div>

        <aside className="anchor-hero-side">
          <p className="anchor-hero-tagline">
            Advertisement-free reporting for public life.
          </p>
          <dl className="anchor-hero-trust">
            {trustSignals.map((signal) => (
              <div key={signal.label}>
                <dt>{signal.label}</dt>
                <dd>{signal.value}</dd>
              </div>
            ))}
          </dl>
          <div className="anchor-hero-actions">
            <Link className="button-primary" href="/assistant">
              Open the assistant
            </Link>
            <Link className="text-link" href="/standards">
              Read our standards
            </Link>
            <Link className="text-link" href="/support">
              Support the newsroom
            </Link>
          </div>
        </aside>
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
