import Link from "next/link";
import { Exhibit } from "@/components/exhibit";
import type { Article } from "@/content/site";

type ArticleCardProps = {
  article: Article;
};

export function ArticleCard({ article }: ArticleCardProps) {
  const showThumbnail = article.format === "data-led" && Boolean(article.leadExhibit);

  return (
    <article className="article-card">
      {showThumbnail && article.leadExhibit ? (
        <div className="article-card-thumbnail">
          <Exhibit exhibit={article.leadExhibit} variant="compact" />
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
