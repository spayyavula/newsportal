import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { Newsreader, Libre_Franklin } from "next/font/google";
import { PreviewBanner } from "@/components/preview-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

const franklin = Libre_Franklin({
  variable: "--font-franklin",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    <html lang="en" className={`${newsreader.variable} ${franklin.variable}`}>
      <head>
        <meta name="theme-color" content="#121212" />
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <ServiceWorkerRegister />
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
