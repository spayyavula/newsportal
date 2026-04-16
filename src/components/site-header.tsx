import Link from "next/link";
import { navigation } from "@/content/site";

const formattedDate = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="masthead">
        <p className="masthead-date">{formattedDate}</p>
        <Link className="masthead-wordmark" href="/">
          Common Ground
        </Link>
        <p className="masthead-tagline">Public-interest news without ads or outrage cues</p>
      </div>
      <div className="masthead-nav-bar">
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
