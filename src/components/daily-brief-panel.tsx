import Link from "next/link";
import type { BriefItem, DailyBrief } from "@/content/site";

function BriefEntry({ item }: { item: BriefItem }) {
  const titleContent = item.articleSlug ? (
    <Link className="daily-brief-item-link" href={`/articles/${item.articleSlug}`}>
      {item.title}
    </Link>
  ) : (
    item.title
  );

  return (
    <li className="daily-brief-item">
      <strong className="daily-brief-item-title">{titleContent}</strong>
      <p className="daily-brief-item-summary">{item.summary}</p>
    </li>
  );
}

export function DailyBriefPanel({ brief }: { brief: DailyBrief }) {
  const publishedDate = new Date(brief.publishedOn);
  const publishedLabel = Number.isNaN(publishedDate.getTime())
    ? null
    : publishedDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });

  return (
    <aside className="panel brief-card daily-brief-panel">
      <p className="eyebrow">Daily brief</p>
      <h2>{brief.headline}</h2>
      {publishedLabel ? (
        <p className="daily-brief-updated">
          <time dateTime={brief.publishedOn}>Updated {publishedLabel}</time>
        </p>
      ) : null}

      <p className="daily-brief-section-label">Three developments worth tracking</p>
      <ul className="daily-brief-list">
        {brief.developments.map((item) => (
          <BriefEntry key={item.title} item={item} />
        ))}
      </ul>

      <p className="daily-brief-section-label">One claim checked against evidence</p>
      <ul className="daily-brief-list">
        <BriefEntry item={brief.factCheck} />
      </ul>

      <p className="daily-brief-section-label">One explainer to save for later</p>
      <ul className="daily-brief-list">
        <BriefEntry item={brief.explainer} />
      </ul>
    </aside>
  );
}
