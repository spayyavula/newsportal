import type { Metadata } from "next";
import Link from "next/link";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/article-card";
import { getArticlesByTopic, getTopics, getTopicBySlug } from "@/lib/cms";

type TopicPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const topics = await getTopics();
  return topics.map((topic) => ({ slug: topic.slug }));
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getTopicBySlug(slug);

  if (!topic) {
    return { title: "Topic" };
  }

  return {
    title: topic.name,
    description: topic.description,
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { isEnabled } = await draftMode();
  const { slug } = await params;
  const [topic, articles] = await Promise.all([
    getTopicBySlug(slug),
    getArticlesByTopic(slug, { preview: isEnabled }),
  ]);

  if (!topic) {
    notFound();
  }

  return (
    <div className="page-stack">
      <section className="panel page-hero">
        <p className="eyebrow">{topic.kicker}</p>
        <h1>{topic.name}</h1>
        <p className="page-copy">{topic.description}</p>
        <p className="page-copy">{topic.landingIntro}</p>
      </section>

      <section className="content-grid">
        <article className="panel content-panel">
          <h2>Editorial focus</h2>
          <p>{topic.editorialFocus}</p>
        </article>
        <article className="panel content-panel">
          <h2>Coverage focus</h2>
          <ul className="plain-list">
            {topic.coverageFocus.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel content-panel">
          <h2>Publishing cadence</h2>
          <p>{topic.cadence}</p>
          <p>
            This section is designed to prioritize recurring public value over a
            stream of reactive posts.
          </p>
        </article>
        <article className="panel content-panel">
          <h2>Key questions</h2>
          <ul className="plain-list">
            {topic.keyQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </article>
      </section>

      {articles.length > 0 ? (
        <section className="panel content-panel">
          <h2>Reporters on this beat</h2>
          <div className="topic-reporters">
            {Array.from(new Map(articles.map((article) => [article.author.slug, article.author])).values()).map((author) => (
              <Link className="topic-reporter-link" href={`/authors/${author.slug}`} key={author.slug}>
                <strong>{author.name}</strong>
                <span>{author.role}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {articles.length > 0 ? (
        <section className="page-section">
          <div className="section-heading">
            <p className="eyebrow">Recent coverage</p>
            <h2>Articles in this topic</h2>
          </div>
          <div className="card-grid card-grid-two">
            {articles.map((article) => (
              <ArticleCard article={article} key={article.slug} />
            ))}
          </div>
        </section>
      ) : (
        <section className="panel content-panel">
          <h2>Live coverage note</h2>
          <p>
            This topic is available now for reader tracking and assistant filtering,
            even if the local archive is still light. For live, source-aware coverage
            on this desk, use the assistant to search current reporting without losing
            the portal&apos;s editorial filters.
          </p>
          <Link className="button-secondary" href="/assistant">
            Use the assistant for this topic
          </Link>
        </section>
      )}
    </div>
  );
}