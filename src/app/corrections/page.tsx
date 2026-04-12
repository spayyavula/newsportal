import type { Metadata } from "next";
import { correctionsLog } from "@/content/site";

export const metadata: Metadata = {
  title: "Corrections",
};

export default function CorrectionsPage() {
  return (
    <div className="page-stack">
      <section className="panel page-hero">
        <p className="eyebrow">Corrections</p>
        <h1>Changes should be visible, timestamped, and easy to understand.</h1>
        <p className="page-copy">
          This log demonstrates the standard we want the newsroom to keep: rapid
          correction, a plain-language explanation, and no hidden substantive edits.
        </p>
      </section>
      <section className="stacked-panels">
        {correctionsLog.map((entry) => (
          <article className="panel content-panel" key={`${entry.date}-${entry.title}`}>
            <p className="card-kicker">{entry.date}</p>
            <h2>{entry.title}</h2>
            <p>{entry.detail}</p>
          </article>
        ))}
      </section>
    </div>
  );
}