import type { Metadata } from "next";
import { editorialPrinciples } from "@/content/site";

export const metadata: Metadata = {
  title: "Editorial Standards",
};

export default function StandardsPage() {
  return (
    <div className="page-stack">
      <section className="panel page-hero">
        <p className="eyebrow">Editorial standards</p>
        <h1>Our rules are public because trust should be inspectable.</h1>
        <p className="page-copy">
          These standards define how stories are selected, labeled, sourced, and
          corrected. They are meant to constrain the product, not merely describe it.
        </p>
      </section>

      <section className="card-grid card-grid-three">
        {editorialPrinciples.map((principle) => (
          <article className="panel content-panel" key={principle.title}>
            <p className="card-kicker">{principle.kicker}</p>
            <h2>{principle.title}</h2>
            <p>{principle.description}</p>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <article className="panel content-panel">
          <h2>Story labeling</h2>
          <ul className="plain-list">
            <li>Reporting is fact-based and source-led.</li>
            <li>Analysis interprets evidence and explains implications.</li>
            <li>Opinion is clearly labeled and separated from the news feed.</li>
          </ul>
        </article>
        <article className="panel content-panel">
          <h2>Corrections policy</h2>
          <ul className="plain-list">
            <li>Material errors are corrected promptly and logged visibly.</li>
            <li>Silent rewrites are not allowed for substantive changes.</li>
            <li>Reader-submitted concerns receive an editorial response.</li>
          </ul>
        </article>
      </section>
    </div>
  );
}