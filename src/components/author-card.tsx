import Link from "next/link";
import type { Author } from "@/content/site";

type AuthorCardProps = {
  author: Author;
  articleCount: number;
};

export function AuthorCard({ author, articleCount }: AuthorCardProps) {
  return (
    <article className="panel author-card">
      <div className="space-y-3">
        <p className="card-kicker">{author.role}</p>
        <h3>
          <Link href={`/authors/${author.slug}`}>{author.name}</Link>
        </h3>
        <p>{author.bio}</p>
      </div>
      <div className="author-card-footer">
        <span>{articleCount} article{articleCount === 1 ? "" : "s"}</span>
        <Link className="text-link" href={`/authors/${author.slug}`}>
          View profile
        </Link>
      </div>
    </article>
  );
}
