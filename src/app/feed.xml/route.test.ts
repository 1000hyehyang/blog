import { afterEach, expect, it, vi } from "vitest";

import { siteConfig } from "@/config/site";
import { getRecentPostContents } from "@/infrastructure/github/posts";
import type { Post } from "@/domain/post";
import * as feedHtml from "@/lib/content/feed-html";
import { GET } from "./route";

vi.mock("@/infrastructure/github/posts", () => ({
  getRecentPostContents: vi.fn(),
}));
afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

it("publishes parseable RSS with absolute article IDs and actual modification dates", async () => {
  const post: Post = {
    id: "article-id",
    slug: "storage-slug",
    title: 'A & B <C> "D"',
    excerpt: "요약 & 설명",
    body: '# 제목\n\n요약 뒤의 전체 본문 & 설명\u0000\n\n```js\nconst end = "</script>";\n```\n\n[내부 링크](/posts)\n\n![그림](/photo.png)\n\n[위험](javascript:alert)\n\n<script>alert(1)</script>\n\n본문 마지막 문장',
    category: { name: "Study", slug: "study" },
    coverImage: { src: "" },
    tags: [],
    featured: false,
    published: true,
    createdAt: "2026-01-01T00:00:00Z",
    publishedAt: "2026-01-05T00:00:00Z",
    lastEditedAt: "2026-02-01T00:00:00Z",
    commentsCount: 0,
    reactionsCount: 0,
  };
  vi.mocked(getRecentPostContents).mockResolvedValue([post, null]);
  const response = await GET();
  expect(response.headers.get("content-type")).toContain("application/rss+xml");
  const xml = new DOMParser().parseFromString(
    await response.text(),
    "application/xml",
  );
  expect(xml.querySelector("parsererror")).toBeNull();
  expect(xml.querySelector("item title")?.textContent).toBe(post.title);
  const body = new DOMParser().parseFromString(
    xml.querySelector("item description")!.textContent!,
    "text/html",
  );
  expect(body.body.textContent).toContain("본문 마지막 문장");
  expect(body.querySelector("code")?.textContent).toContain("</script>");
  expect(body.querySelector("a")?.href).toBe(`${siteConfig.url}/posts`);
  expect(body.querySelector("img")?.src).toBe(`${siteConfig.url}/photo.png`);
  expect(body.querySelector("script")).toBeNull();
  expect(body.querySelector('[href^="javascript:"]')).toBeNull();
  expect(xml.querySelector("pubDate")?.textContent).toBe(
    "Mon, 05 Jan 2026 00:00:00 GMT",
  );
  expect(xml.querySelector("item link")?.textContent).toBe(
    `${siteConfig.url}/article-id`,
  );
  expect(xml.querySelector("item guid")?.textContent).toBe(
    `${siteConfig.url}/article-id`,
  );
  expect(xml.querySelector("lastBuildDate")?.textContent).toBe(
    "Sun, 01 Feb 2026 00:00:00 GMT",
  );
  vi.mocked(getRecentPostContents).mockResolvedValue([]);
  const empty = new DOMParser().parseFromString(
    await (await GET()).text(),
    "application/xml",
  );
  expect(empty.querySelector("parsererror")).toBeNull();
  expect(empty.querySelector("lastBuildDate")).toBeNull();
  expect(empty.querySelector("item")).toBeNull();
});

it("omits whole older entries before the feed exceeds 10 MB", async () => {
  const post = {
    id: "large",
    slug: "large",
    title: "Large",
    excerpt: "summary",
    body: "body",
    category: { name: "Study", slug: "study" },
    coverImage: { src: "" },
    tags: [],
    featured: false,
    published: true,
    createdAt: "2026-01-01T00:00:00Z",
    lastEditedAt: null,
    commentsCount: 0,
    reactionsCount: 0,
  } satisfies Post;
  const posts = Array.from({ length: 12 }, (_, i) => ({
    ...post,
    id: `large-${i}`,
  }));
  vi.mocked(getRecentPostContents).mockResolvedValue(posts.slice(0, 10));
  vi.spyOn(feedHtml, "renderFeedHtml").mockReturnValue(
    "x".repeat(3_000_000) + "END",
  );
  const xml = await (await GET()).text();
  expect(Buffer.byteLength(xml)).toBeLessThan(10_000_000);
  expect(xml.match(/<item>/g)).toHaveLength(2);
  expect(xml.match(/END<\/description>/g)).toHaveLength(2);
  expect(xml).not.toContain("/large-2</link>");
  expect(getRecentPostContents).toHaveBeenCalledWith(10);
});
