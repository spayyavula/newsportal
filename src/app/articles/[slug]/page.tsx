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

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { isEnabled } = await draftMode();
  const { slug } = await params;
  const article = await getArticleBySlug(slug, { preview: isEnabled });

  if (!article) {
    notFound();
  }

  const relatedArticles = (await getArticles({ preview: isEnabled }))
    .filter(
      (entry) => entry.topic.slug === article.topic.slug && entry.slug !== article.slug,
    )
    .slice(0, 2);

  const fallbackRelated =
    relatedArticles.length > 0
      ? relatedArticles
      : getFallbackRelatedArticles(article.topic.slug, article.slug);

  return (
    <div className="page-stack">
      <section className="panel article-shell">
        <div className="article-header">
          <div className="article-topline">
            <span className="label-pill">{article.storyType}</span>
            <span>{article.topic.name}</span>
            <span>{article.readTime}</span>
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
                {article.sources.map((source) => (
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

      {fallbackRelated.length > 0 ? (
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
            {fallbackRelated.map((entry) => (
              <ArticleCard article={entry} key={entry.slug} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}