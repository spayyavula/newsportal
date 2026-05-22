type ExecutiveSummaryProps = {
  bullets: string[];
};

export function ExecutiveSummary({ bullets }: ExecutiveSummaryProps) {
  if (bullets.length === 0) {
    return null;
  }

  return (
    <section className="executive-summary">
      <p className="eyebrow">Key findings</p>
      <ul className="executive-summary-list">
        {bullets.map((bullet, index) => (
          <li key={`bullet-${index}-${bullet.slice(0, 24)}`} className="executive-summary-item">
            {bullet}
          </li>
        ))}
      </ul>
    </section>
  );
}
