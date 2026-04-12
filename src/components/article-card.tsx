import Link from "next/link";
import type { Article } from "@/content/site";

type ArticleCardProps = {
  article: Article;
};

export function ArticleCard({ article }: ArticleCardProps) {
  return (
    <article className="panel article-card">
      <div className="article-card-topline">
        <span className="label-pill">{article.storyType}</span>
        <span>{article.readTime}</span>
      </div>
      <div className="space-y-3">
        <p className="card-kicker">{article.topic.name}</p>
        <h3>
          <Link href={`/articles/${article.slug}`}>{article.title}</Link>
        </h3>
        <p>{article.summary}</p>
      </div>
      <div className="article-card-meta">
        <span>{article.author.name}</span>
        <span>{new Date(article.publishedOn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
      </div>
    </article>
  );
}