import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/article-card";
import { getArticlesByAuthor, getAuthorBySlug, getAuthors } from "@/lib/cms";

type AuthorPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const authors = await getAuthors();
  return authors.map((author) => ({ slug: author.slug }));
}

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);

  if (!author) {
    return { title: "Author" };
  }

  return {
    title: author.name,
    description: author.bio,
  };
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { isEnabled } = await draftMode();
  const { slug } = await params;
  const [author, articles] = await Promise.all([
    getAuthorBySlug(slug),
    getArticlesByAuthor(slug, { preview: isEnabled }),
  ]);

  if (!author) {
    notFound();
  }

  return (
    <div className="page-stack">
      <section className="panel page-hero author-hero">
        <p className="eyebrow">Author profile</p>
        <h1>{author.name}</h1>
        <p className="page-copy">{author.bio}</p>
        <div className="author-bio-meta">
          <span>{author.role}</span>
          <span>{author.credentials}</span>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel content-panel">
          <h2>Coverage areas</h2>
          <ul className="plain-list">
            {author.coverageAreas.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="panel content-panel">
          <h2>Editorial principles</h2>
          <ul className="plain-list">
            {author.editorialPrinciples.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="panel content-panel">
        <h2>How to reach this desk</h2>
        <p>{author.contactNote}</p>
      </section>

      <section className="page-section">
        <div className="section-heading">
          <p className="eyebrow">Recent work</p>
          <h2>Articles by {author.name}</h2>
        </div>
        <div className="card-grid card-grid-two">
          {articles.map((article) => (
            <ArticleCard article={article} key={article.slug} />
          ))}
        </div>
      </section>
    </div>
  );
}
