import Link from "next/link";
import type { Article } from "@/content/site";

export function DeepDivePanel({ article }: { article: Article }) {
  const summaryBullets = article.executiveSummary ?? [];
  const previewBullets = summaryBullets.slice(0, 2);
  const remaining = summaryBullets.length - previewBullets.length;

  return (
    <article className="panel story-feature deep-dive-panel">
      <p className="eyebrow">Deep dive</p>
      <div className="story-meta">
        <span>{article.topic.name}</span>
        <span>{article.readTime}</span>
      </div>
      <h2>{article.title}</h2>
      <p>{article.summary}</p>

      {previewBullets.length > 0 ? (
        <ul className="deep-dive-summary-preview">
          {previewBullets.map((bullet, index) => (
            <li key={`preview-${index}-${bullet.slice(0, 24)}`}>{bullet}</li>
          ))}
          {remaining > 0 ? (
            <li className="deep-dive-summary-more">
              …and {remaining} more finding{remaining === 1 ? "" : "s"}.
            </li>
          ) : null}
        </ul>
      ) : null}

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
