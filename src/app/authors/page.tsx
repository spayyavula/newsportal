import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { AuthorCard } from "@/components/author-card";
import { getArticlesByAuthor, getAuthors } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Authors",
};

export default async function AuthorsPage() {
  const { isEnabled } = await draftMode();
  const authors = await getAuthors();

  const authorCards = await Promise.all(
    authors.map(async (author) => ({
      author,
      articleCount: (await getArticlesByAuthor(author.slug, { preview: isEnabled })).length,
    })),
  );

  return (
    <div className="page-stack">
      <section className="panel page-hero">
        <p className="eyebrow">Authors</p>
        <h1>Transparent bylines are part of the trust model.</h1>
        <p className="page-copy">
          Each profile makes expertise, coverage focus, and authored reporting visible.
        </p>
      </section>

      <section className="card-grid card-grid-three">
        {authorCards.map(({ author, articleCount }) => (
          <AuthorCard author={author} articleCount={articleCount} key={author.slug} />
        ))}
      </section>
    </div>
  );
}
