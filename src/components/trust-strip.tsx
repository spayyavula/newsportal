import Link from "next/link";
import { editorialPrinciples } from "@/content/site";

export function TrustStrip() {
  return (
    <section className="page-section editorial-trust-strip">
      <ol className="editorial-trust-strip-list">
        {editorialPrinciples.map((principle, index) => (
          <li key={principle.title} className="editorial-trust-strip-item">
            <div className="editorial-trust-strip-meta">
              <span className="editorial-trust-strip-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="editorial-trust-strip-kicker">{principle.kicker}</span>
            </div>
            <h3 className="editorial-trust-strip-title">{principle.title}</h3>
          </li>
        ))}
      </ol>
      <Link className="text-link editorial-trust-strip-link" href="/standards">
        Read the full standards
      </Link>
    </section>
  );
}
