import { siteConfig } from "@/config/site";
import { getRecentPostContents } from "@/infrastructure/github/posts";
import { resolvePostModifiedAt, resolvePostPublishedAt } from "@/lib/content";
import { renderFeedHtml } from "@/lib/content/feed-html";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/seo";

function escapeXml(value: string) {
  return value
    .replace(/[^\t\n\r\x20-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, "")
    .replace(
      /[<>&'"]/g,
      (character) =>
        ({
          "<": "&lt;",
          ">": "&gt;",
          "&": "&amp;",
          "'": "&apos;",
          '"': "&quot;",
        })[character] ?? character,
    );
}

export async function GET() {
  const posts = await getRecentPostContents(10);
  const items: string[] = [];
  let bytes = 0;
  let latestModified: string | undefined;
  for (const post of posts) {
    if (!post) continue;
    const url = absoluteUrl(routes.post(post.id));
    const body = renderFeedHtml(post.body, url);
    const postUrl = escapeXml(url);
    const item = `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid>${postUrl}</guid>
      <description>${escapeXml(body)}</description>
      <category>${escapeXml(post.category.name)}</category>
      <pubDate>${new Date(resolvePostPublishedAt(post)).toUTCString()}</pubDate>
    </item>`;
    // 채널 정보를 포함해 10MB 미만을 유지하도록 오래된 항목을 통째로 제외한다.
    bytes += Buffer.byteLength(item);
    if (bytes > 8_000_000) break;
    items.push(item);
    const modified = resolvePostModifiedAt(post);
    if (!latestModified || Date.parse(modified) > Date.parse(latestModified))
      latestModified = modified;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
      <title>${escapeXml(siteConfig.name)}</title>
      <link>${escapeXml(siteConfig.url)}</link>
      <description>${escapeXml(siteConfig.description)}</description>
      <language>ko-KR</language>
      ${latestModified ? `<lastBuildDate>${new Date(latestModified).toUTCString()}</lastBuildDate>` : ""}
      <atom:link href="${escapeXml(absoluteUrl(routes.feed))}" rel="self" type="application/rss+xml" />
      ${items.join("")}
    </channel></rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
