import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVoiceBySlug } from "@/lib/cms";

type VoicePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: VoicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getVoiceBySlug(slug);
  if (!article) return { title: "Voice" };
  return { title: article.title, description: article.summary };
}

export default async function VoicePage({ params }: VoicePageProps) {
  const { slug } = await params;
  const article = await getVoiceBySlug(slug);
  if (!article) notFound();

  const bylineName = article.contributorByline?.split(":")[1] ?? "Contributor";

  return (
    <div className="page-stack">
      <section className="panel article-shell voices-shell">
        <div className="article-header">
          <div className="article-topline">
            <span className="label-pill">Reader contribution</span>
            <span>{article.topic.name}</span>
            <span>{article.readTime}</span>
          </div>
          <h1>{article.title}</h1>
          <div className="byline-row">
            <p className="byline-name">By {bylineName}</p>
            <p className="byline-date">
              {new Date(article.publishedOn).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <article
          className="article-body voices-body"
          dangerouslySetInnerHTML={{ __html: article.body.replace(/\n/g, "<br/>") }}
        />

        {article.sourceNotes && article.sourceNotes.length > 0 ? (
          <section className="source-notes">
            <p className="eyebrow">Sources cited by the contributor</p>
            <ol className="source-notes-list">
              {article.sourceNotes.map((note, index) => (
                <li key={`note-${index}-${note.text.slice(0, 24)}`}>
                  {note.url ? (
                    <a href={note.url} rel="noreferrer" target="_blank">{note.text}</a>
                  ) : (
                    note.text
                  )}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <footer className="voices-footer">
          This piece reflects the contributor&apos;s views, not the Common Ground newsroom&apos;s reporting.
        </footer>
      </section>
    </div>
  );
}
