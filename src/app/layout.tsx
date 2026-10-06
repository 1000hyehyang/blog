import type { Metadata } from "next";
import { Suspense } from "react";

import { ClickRipple } from "@/components/click-ripple";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { wantedSansStylesheetUrl } from "@/config/fonts";
import { siteConfig } from "@/config/site";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/seo";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  authors: [
    { name: siteConfig.author.name, url: siteConfig.socialLinks.github },
  ],
  creator: siteConfig.author.name,
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.defaultImage],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.defaultImage],
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className="h-full antialiased">
      <head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title={siteConfig.name}
          href={absoluteUrl(routes.feed)}
        />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link rel="stylesheet" href={wantedSansStylesheetUrl} />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <Suspense fallback={null}>
            <ScrollToTop />
          </Suspense>
          <ClickRipple />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
