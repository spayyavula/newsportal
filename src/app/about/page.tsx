import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="page-stack">
      <section className="panel page-hero">
        <p className="eyebrow">About the newsroom</p>
        <h1>Built for readers who want signal instead of stimulation.</h1>
        <p className="page-copy">
          Common Ground is a model for a small, reader-supported news portal that
          treats attention as limited and trust as hard-earned. The editorial
          strategy is simple: publish fewer pieces, make them easier to verify,
          and keep a visible record of what changed.
        </p>
      </section>

      <section className="content-grid">
        <article className="panel content-panel">
          <h2>What the product optimizes for</h2>
          <ul className="plain-list">
            <li>Clear distinctions between reporting, analysis, and opinion.</li>
            <li>Context-first explainers that remain useful after the news cycle.</li>
            <li>Coverage areas where public understanding has real civic value.</li>
            <li>Reader funding models that do not reward outrage or surveillance.</li>
          </ul>
        </article>
        <article className="panel content-panel">
          <h2>What the product rejects</h2>
          <ul className="plain-list">
            <li>Headline testing for emotional provocation.</li>
            <li>Ad slots, sponsored feed placements, and attention traps.</li>
            <li>Breaking-news churn that crowds out explanation.</li>
            <li>Ambiguous sourcing and invisible editorial changes.</li>
          </ul>
        </article>
      </section>
    </div>
  );
}