import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { Newsreader, Public_Sans } from "next/font/google";
import { PreviewBanner } from "@/components/preview-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Common Ground",
    template: "%s | Common Ground",
  },
  description:
    "An advertisement-free news portal built around public-interest reporting, clear sourcing, and calm editorial judgment.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isEnabled } = await draftMode();

  return (
    <html lang="en" className={`${newsreader.variable} ${publicSans.variable}`}>
      <body>
        <div className="site-shell">
          {isEnabled ? <PreviewBanner /> : null}
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
