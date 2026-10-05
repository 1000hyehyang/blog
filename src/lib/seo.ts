import type { Metadata } from "next";

import { getCategoryNavigation, siteConfig } from "@/config/site";
import type { Post } from "@/domain/post";
import { resolvePostModifiedAt, resolvePostPublishedAt } from "@/lib/content";
import { routes } from "@/lib/routes";

// 스트리밍이 시작된 오류 응답도 메타데이터 단계부터 색인에서 제외한다.
export const missingPageMetadata: Metadata = {
  title: "페이지를 찾을 수 없습니다",
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

export function absoluteUrl(path: string) {
  return path === "/"
    ? siteConfig.url
    : new URL(path, `${siteConfig.url}/`).href;
}

export function buildPostJsonLd(post: Post) {
  const image = post.coverImage.src || post.galleryImage?.src;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    url: absoluteUrl(routes.post(post.id)),
    headline: post.title,
    description: post.excerpt || post.title,
    ...(image && { image: absoluteUrl(image) }),
    articleSection: post.category.name,
    datePublished: resolvePostPublishedAt(post),
    dateModified: resolvePostModifiedAt(post),
    keywords: post.tags.join(", "),
    inLanguage: "ko-KR",
    author: {
      "@type": "Person",
      name: siteConfig.author.name,
      url: siteConfig.socialLinks.github,
    },
    publisher: { "@type": "Person", name: siteConfig.author.name },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(routes.post(post.id)),
    },
  };
}

export function getPostBreadcrumbs(post: Post) {
  const category = getCategoryNavigation(post.category.slug);
  const series = category?.series.find((item) => item.slug === post.series);
  return [
    { name: "홈", href: routes.home },
    category
      ? { name: category.label, href: routes.category(category.category) }
      : { name: "모든 글", href: routes.posts },
    ...(series
      ? [
          {
            name: series.label,
            href: routes.series(category!.category, series.slug),
          },
        ]
      : []),
    { name: post.title, href: routes.post(post.id) },
  ];
}

export function buildBreadcrumbJsonLd(items: { name: string; href: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.href),
    })),
  };
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    inLanguage: "ko-KR",
    author: {
      "@type": "Person",
      name: siteConfig.author.name,
      url: siteConfig.socialLinks.github,
    },
  };
}

// 본문의 </script>가 JSON-LD 태그를 닫지 못하도록 이스케이프한다.
export function serializeJsonLd(value: object) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
