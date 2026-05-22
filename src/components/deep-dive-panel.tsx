import Link from "next/link";
import type { Article } from "@/content/site";

export function DeepDivePanel({ article }: { article: Article }) {
  return (
    <article className="panel story-feature deep-dive-panel">
      <p className="eyebrow">Deep dive</p>
      <div className="story-meta">
        <span>{article.topic.name}</span>
        <span>{article.readTime}</span>
      </div>
      <h2>{article.title}</h2>
      <p>{article.summary}</p>
      <ul className="source-list">
        {article.sources.map((source, index) => (
          <li key={`source-${index}-${source}`}>{source}</li>
        ))}
      </ul>
      <Link className="button-secondary" href={`/articles/${article.slug}`}>
        Read the full article
      </Link>
    </article>
  );
}
