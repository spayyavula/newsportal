import type { Metadata } from "next";
import { draftMode } from "next/headers";
import Link from "next/link";
import { getArticlesByTopic, getTopics } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Topics",
};

export default async function TopicsPage() {
  const { isEnabled } = await draftMode();
  const topics = await getTopics();

  const topicsWithCounts = await Promise.all(
    topics.map(async (topic) => ({
      topic,
      articleCount: (await getArticlesByTopic(topic.slug, { preview: isEnabled })).length,
    })),
  );

  return (
    <div className="page-stack">
      <section className="panel page-hero">
        <p className="eyebrow">Topics</p>
        <h1>Coverage starts with durable beats and high-interest public topics.</h1>
        <p className="page-copy">
          The portal covers both enduring desks and the major issues people are actively
          trying to understand right now. Each topic is scoped to keep reporting useful,
          sourced, and resistant to sensational framing.
        </p>
      </section>

      <section className="card-grid card-grid-two">
        {topicsWithCounts.map(({ topic, articleCount }) => (
          <Link className="panel topic-card" href={`/topics/${topic.slug}`} key={topic.slug}>
            <div>
              <p className="card-kicker">{topic.kicker}</p>
              <h2>{topic.name}</h2>
            </div>
            <p>{topic.landingIntro}</p>
            <p className="topic-meta">{articleCount} article{articleCount === 1 ? "" : "s"}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}