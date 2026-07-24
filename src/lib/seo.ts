import { siteConfig } from "@/config/site";
import type { Post } from "@/domain/post";
import { resolvePostModifiedAt } from "@/lib/content";
import { routes } from "@/lib/routes";

export function absoluteUrl(path: string) {
  return `${siteConfig.url}${path === "/" ? "" : path}`;
}

export function buildPostJsonLd(post: Post) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage || absoluteUrl(siteConfig.defaultImage),
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
      "@id": absoluteUrl(routes.post(post.number)),
    },
  };
}

export function buildBlogJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
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

/** JSON-LD를 script 태그에 안전하게 삽입할 수 있는 문자열로 직렬화한다. */
export function serializeJsonLd(value: object) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
