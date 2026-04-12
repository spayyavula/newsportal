import Link from "next/link";
import { navigation } from "@/content/site";

export function SiteFooter() {
  return (
    <footer>
      <div className="site-footer-inner footer-note">
        <p>
          Common Ground is structured as an advertisement-free editorial product.
          The goal is durable trust: fewer stories, better sourcing, visible
          corrections, and a homepage ordered by consequence rather than clicks.
        </p>
        <nav className="footer-nav" aria-label="Footer">
          {navigation.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}