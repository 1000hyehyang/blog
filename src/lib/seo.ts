import { siteConfig } from "@/config/site";
import type { Post } from "@/domain/post";
import { resolvePostModifiedAt } from "@/lib/content";
import { routes } from "@/lib/routes";

export function absoluteUrl(path: string) {
  return path === "/"
    ? siteConfig.url
    : new URL(path, `${siteConfig.url}/`).href;
}

export function buildPostJsonLd(post: Post) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    url: absoluteUrl(routes.post(post.slug)),
    headline: post.title,
    description: post.excerpt || post.title,
    image: absoluteUrl(post.coverImage.src || siteConfig.defaultImage),
    articleSection: post.category.name,
    datePublished: post.createdAt,
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
      "@id": absoluteUrl(routes.post(post.slug)),
    },
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
