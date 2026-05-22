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
