import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVoices } from "@/lib/cms";

type ContributorProfileProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ContributorProfileProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug} — Voices contributor` };
}

export default async function ContributorProfile({ params }: ContributorProfileProps) {
  const { slug } = await params;
  const allVoices = await getVoices();

  const matches = allVoices.filter((article) => {
    const username = article.contributorByline?.split(":")[1];
    return username === slug;
  });

  if (matches.length === 0) {
    notFound();
  }

  return (
    <div className="page-stack">
      <section className="panel page-hero">
        <p className="eyebrow">Voices contributor</p>
        <h1>{slug}</h1>
        <p className="page-copy">
          A vetted community contributor publishing on Voices.
        </p>
      </section>

      <section className="page-section">
        <div className="section-heading">
          <p className="eyebrow">Recent pieces</p>
        </div>
        <div className="card-grid card-grid-two">
          {matches.map((article) => (
            <article className="voices-card" key={article.slug}>
              <h2>
                <Link href={`/voices/${article.slug}`}>{article.title}</Link>
              </h2>
              <p className="voices-card-byline">{article.readTime}</p>
              <p className="voices-card-summary">{article.summary}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
