import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { ArticleCard } from "@/components/article-card";
import { getArticles } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Articles",
};

export default async function ArticlesPage() {
  const { isEnabled } = await draftMode();
  const articles = await getArticles({ preview: isEnabled });

  return (
    <div className="page-stack">
      <section className="panel page-hero">
        <p className="eyebrow">Articles</p>
        <h1>Reporting, analysis, and opinion are labeled explicitly.</h1>
        <p className="page-copy">
          This index is backed by Strapi when configured, and falls back to local
          sample content during frontend-only development.
        </p>
      </section>

      <section className="card-grid card-grid-three">
        {articles.map((article) => (
          <ArticleCard article={article} key={article.slug} />
        ))}
      </section>
    </div>
  );
}