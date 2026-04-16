import Link from "next/link";
import { navigation } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner footer-note">
        <p className="site-footer-mission">
          Common Ground is structured as an advertisement-free editorial product. The goal is
          durable trust: fewer stories, better sourcing, visible corrections, and a homepage
          ordered by consequence rather than clicks.
        </p>
        <nav className="footer-nav" aria-label="Footer">
          {navigation.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="site-footer-copy">
          © {new Date().getFullYear()} Common Ground. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
