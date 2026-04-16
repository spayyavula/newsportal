import type { Metadata } from "next";
import { draftMode } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/article-card";
import { ArticleContentBlocks } from "@/components/article-content-blocks";
import {
  getArticleBySlug,
  getArticles,
  getFallbackRelatedArticles,
} from "@/lib/cms";

type ArticlePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const articles = await getArticles();
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { isEnabled } = await draftMode();
  const { slug } = await params;
  const article = await getArticleBySlug(slug, { preview: isEnabled });

  if (!article) {
    return { title: "Article" };
  }

  return {
    title: article.title,
    description: article.summary,
  };
}

"use client";
import { useEffect, useState } from "react";
import { incrementArticleView, sendTip } from "@/lib/cms";

export default function ArticlePageWrapper(props: ArticlePageProps) {
  // Use a client component wrapper to handle side effects
  return <ArticlePageClient {...props} />;
}

function ArticlePageClient({ params }: ArticlePageProps) {
  const [views, setViews] = useState<number | null>(null);
  const [tipModal, setTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState(2);
  const [tipMessage, setTipMessage] = useState("");
  const [tipStatus, setTipStatus] = useState<string | null>(null);
  const [article, setArticle] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { isEnabled } = await draftMode();
      const { slug } = await params;
      const art = await getArticleBySlug(slug, { preview: isEnabled });
      if (!art) return;
      setArticle(art);
      // Increment view count
      const res = await incrementArticleView(art.id || art.slug);
      setViews(res?.views ?? null);
      // Related
      const rel = (await getArticles({ preview: isEnabled }))
        .filter((entry) => entry.topic.slug === art.topic.slug && entry.slug !== art.slug)
        .slice(0, 2);
      setRelated(rel.length > 0 ? rel : getFallbackRelatedArticles(art.topic.slug, art.slug));
    })();
  }, [params]);

  if (!article) return null;

  return (
    <div className="page-stack">
      <section className="panel article-shell">
        <div className="article-header">
          <div className="article-topline">
            <span className="label-pill">{article.storyType}</span>
            <span>{article.topic.name}</span>
            <span>{article.readTime}</span>
            {views !== null && (
              <span style={{ marginLeft: 8, color: '#888' }}>{views} views</span>
            )}
          </div>
          <h1>{article.title}</h1>
          <p className="article-summary">{article.summary}</p>
          <div className="byline-row">
            <div>
              <p className="byline-name">{article.author.name}</p>
              <p className="byline-role">{article.author.role}</p>
            </div>
            <p className="byline-date">
              {new Date(article.publishedOn).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="article-layout">
          <article className="article-body">
            <div dangerouslySetInnerHTML={{ __html: article.body }} />
            <ArticleContentBlocks blocks={article.contentBlocks} />
          </article>

          <aside className="stacked-panels">
            <div className="panel content-panel">
              <h2>Sources used</h2>
              <ul className="plain-list">
                {article.sources.map((source: string) => (
                  <li key={source}>{source}</li>
                ))}
              </ul>
            </div>
            <div className="panel content-panel">
              <h2>Author</h2>
              <p className="byline-name">
                <Link href={`/authors/${article.author.slug}`}>{article.author.name}</Link>
              </p>
              <p>{article.author.bio}</p>
              <p>{article.author.credentials}</p>
              <Link className="text-link" href={`/authors/${article.author.slug}`}>
                View author profile
              </Link>
              <button className="button" style={{ marginTop: 12 }} onClick={() => setTipModal(true)}>
                Tip this writer
              </button>
              {tipStatus && <p style={{ color: 'green' }}>{tipStatus}</p>}
            </div>
            <div className="panel content-panel">
              <h2>Topic</h2>
              <p>{article.topic.description}</p>
              <Link className="text-link" href={`/topics/${article.topic.slug}`}>
                Explore {article.topic.name}
              </Link>
            </div>
          </aside>
        </div>
      </section>

      {tipModal && (
        <div className="modal" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 320 }}>
            <h3>Tip {article.author.name}</h3>
            <input type="number" min={1} value={tipAmount} onChange={e => setTipAmount(Number(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />
            <input type="text" placeholder="Message (optional)" value={tipMessage} onChange={e => setTipMessage(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
            <button className="button" onClick={async () => {
              setTipStatus(null);
              const res = await sendTip({ authorId: article.author.id, articleId: article.id, amount: tipAmount, currency: 'USD', message: tipMessage });
              if (res) setTipStatus('Thank you for your tip!');
              else setTipStatus('Tip failed. Please try again.');
              setTipModal(false);
            }}>Send Tip</button>
            <button className="button" style={{ marginLeft: 8 }} onClick={() => setTipModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {related.length > 0 ? (
        <section className="page-section">
          <div className="section-heading section-heading-row">
            <div>
              <p className="eyebrow">Related coverage</p>
              <h2>More from this coverage area</h2>
            </div>
            <Link className="text-link" href="/articles">
              Back to all articles
            </Link>
          </div>
          <div className="card-grid card-grid-two">
            {related.map((entry) => (
              <ArticleCard article={entry} key={entry.slug} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}