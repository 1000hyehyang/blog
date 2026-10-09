import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";
import type { Post } from "@/domain/post";
import {
  absoluteUrl,
  buildPostJsonLd,
  buildWebsiteJsonLd,
  getPostBreadcrumbs,
  buildBreadcrumbJsonLd,
  serializeJsonLd,
} from "./seo";

const post: Post = {
  id: "article-id-1",
  slug: "post-1",
  title: "글 제목",
  body: "본문",
  excerpt: "글 요약",
  coverImage: { src: "/cover.png" },
  category: { name: "Study", slug: "study" },
  tags: ["공부"],
  featured: false,
  published: true,
  createdAt: "2026-01-01T00:00:00Z",
  lastEditedAt: null,
  commentsCount: 0,
  reactionsCount: 0,
};

describe("SEO structured data", () => {
  it("resolves local URLs and preserves external image URLs", () => {
    expect(absoluteUrl("/")).toBe(siteConfig.url);
    expect(absoluteUrl("/article-id-1")).toBe(`${siteConfig.url}/article-id-1`);
    expect(buildPostJsonLd(post).image).toBe(`${siteConfig.url}/cover.png`);
    expect(
      buildPostJsonLd({
        ...post,
        coverImage: { src: "https://images.example.com/cover.png" },
      }).image,
    ).toBe("https://images.example.com/cover.png");
  });

  it("includes article identity, dates and fallbacks for empty summaries", () => {
    expect(
      buildPostJsonLd({ ...post, publishedAt: "2026-02-01T00:00:00Z" }),
    ).toMatchObject({
      datePublished: "2026-02-01T00:00:00Z",
      dateModified: "2026-02-01T00:00:00Z",
    });
    expect(
      buildPostJsonLd({ ...post, excerpt: "", coverImage: { src: "" } }),
    ).toMatchObject({
      "@type": "BlogPosting",
      url: `${siteConfig.url}/article-id-1`,
      description: post.title,
      articleSection: "Study",
      datePublished: post.createdAt,
      dateModified: post.createdAt,
      mainEntityOfPage: { "@id": `${siteConfig.url}/article-id-1` },
    });
    expect(
      buildPostJsonLd({ ...post, lastEditedAt: "2026-02-01T00:00:00Z" })
        .dateModified,
    ).toBe("2026-02-01T00:00:00Z");
  });

  it("only marks up a representative article image, not the site logo", () => {
    expect(
      buildPostJsonLd({ ...post, coverImage: { src: "" } }),
    ).not.toHaveProperty("image");
    expect(
      buildPostJsonLd({
        ...post,
        coverImage: { src: "" },
        galleryImage: { src: "/art.png" },
      }).image,
    ).toBe(`${siteConfig.url}/art.png`);
  });

  it("uses the configured category and series path in breadcrumbs", () => {
    const items = getPostBreadcrumbs({
      ...post,
      category: { name: "Essay", slug: "essay" },
      series: "life-updates",
    });
    expect(items.map((item) => item.href)).toEqual([
      "/",
      "/category/essay",
      "/category/essay/series/life-updates",
      "/article-id-1",
    ]);
    expect(buildBreadcrumbJsonLd(items).itemListElement).toEqual(
      items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: absoluteUrl(item.href),
      })),
    );
    expect(
      getPostBreadcrumbs({
        ...post,
        category: { name: "Other", slug: "other" },
      })[1].href,
    ).toBe("/posts");
  });

  it("identifies the homepage as a WebSite with the configured name", () => {
    expect(buildWebsiteJsonLd()).toMatchObject({
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url,
    });
  });

  it("keeps script-closing text inside JSON-LD", () => {
    const value = { headline: "</script><script>alert(1)</script>" };
    const serialized = serializeJsonLd(value);
    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toEqual(value);
  });
});
