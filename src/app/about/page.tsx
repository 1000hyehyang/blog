import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "소개",
  description: `${siteConfig.author.name} 소개`,
  alternates: { canonical: routes.about },
};

export default function AboutPage() {
  return (
    <div className="container-shell py-20">
      <div className="mx-auto max-w-[var(--content-width)]">
        <p className="text-xs text-tertiary">ABOUT</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          {siteConfig.author.name}
        </h1>
        <p className="mt-3 text-secondary">{siteConfig.author.role}</p>
        <div className="prose mt-12">
          <p>{siteConfig.description}</p>
          <p>
            배운 것을 오래 기억하고, 다른 개발자에게 도움이 되도록 기록합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
