import type { Metadata } from "next";
import { supportModel, supportReasons } from "@/content/site";

export const metadata: Metadata = {
  title: "Support",
};

export default function SupportPage() {
  return (
    <div className="page-stack">
      <section className="panel page-hero support-hero">
        <p className="eyebrow">Support the newsroom</p>
        <h1>Funding should protect editorial judgment, not pressure it.</h1>
        <p className="page-copy">
          A portal that rejects advertising needs a revenue model aligned with
          reader trust. This first version assumes memberships, direct reader
          support, and carefully bounded grant funding.
        </p>
      </section>

      <section className="card-grid card-grid-three">
        {supportReasons.map((reason) => (
          <article className="panel content-panel" key={reason.title}>
            <h2>{reason.title}</h2>
            <p>{reason.description}</p>
          </article>
        ))}
      </section>

      <section className="panel content-panel">
        <h2>Recommended revenue mix for the first year</h2>
        <ul className="plain-list">
          {supportModel.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}