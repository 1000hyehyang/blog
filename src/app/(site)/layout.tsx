import Script from "next/script";
import type { ReactNode } from "react";

import { SiteFrame } from "@/components/layout/site-frame";

export default function SiteLayout({ children }: { children: ReactNode }) {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

  return (
    <SiteFrame>
      {children}
      {measurementId && /^G-[A-Z0-9]+$/.test(measurementId) && (
        <>
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag() { window.dataLayer.push(arguments); }
gtag("js", new Date());
gtag("config", ${JSON.stringify(measurementId)});`}
          </Script>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
            strategy="afterInteractive"
          />
        </>
      )}
    </SiteFrame>
  );
}
