import Link from "next/link";
import { navigation } from "@/content/site";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand-lockup" href="/">
          <span className="brand-title">Common Ground</span>
          <span className="brand-tagline">Public-interest news without ads or outrage cues</span>
        </Link>
        <nav className="nav-links" aria-label="Primary">
          {navigation.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}