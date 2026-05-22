import type { Metadata } from "next";
import Link from "next/link";
import { getVoices } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Voices — reader contributions",
  description:
    "Vetted reader contributors publish short first-person essays on Voices. These are perspectives, not Common Ground reporting.",
};

export default async function VoicesIndexPage() {
  const voices = await getVoices();

  return (
    <div className="page-stack">
      <section className="panel page-hero">
        <p className="eyebrow">Voices</p>
        <h1>Reader contributions</h1>
        <p className="page-copy">
          Voices is where vetted readers publish first-person essays.
          These are individual perspectives, not Common Ground reporting.
        </p>
        <p className="page-copy">
          <Link className="text-link" href="/voices/apply">
            Apply to contribute
          </Link>
        </p>
      </section>

      {voices.length === 0 ? (
        <section className="panel">
          <p>No community contributions yet — be the first to apply.</p>
        </section>
      ) : (
        <section className="page-section">
          <div className="card-grid card-grid-two">
            {voices.map((article) => (
              <article className="voices-card" key={article.slug}>
                <p className="card-kicker">Reader contribution</p>
                <h2>
                  <Link href={`/voices/${article.slug}`}>{article.title}</Link>
                </h2>
                <p className="voices-card-byline">
                  {article.contributorByline?.split(":")[1] ?? "Contributor"} ·{" "}
                  {article.readTime}
                </p>
                <p className="voices-card-summary">{article.summary}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
