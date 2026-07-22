import type { Metadata } from "next";

import { ClickRipple } from "@/components/click-ripple";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { wantedSansStylesheetUrl } from "@/config/fonts";
import { siteConfig } from "@/config/site";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className="h-full antialiased">
      <head>
        <link rel="stylesheet" href={wantedSansStylesheetUrl} />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <ClickRipple />
          <SiteHeader />
          <main className="flex-1 pt-[var(--header-height)]">{children}</main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
