import "server-only";

import { lookup } from "node:dns/promises";

import { unstable_cache } from "next/cache";

import { siteConfig } from "@/config/site";
import { getPost } from "@/infrastructure/github/github";
import {
  isNonPublicIpAddress,
  parseExternalHttpUrl,
  parseLinkPreviewHtml,
  type LinkPreviewMetadata,
} from "@/lib/link-preview";
import { readLimitedResponseText } from "@/lib/limited-response";

const CACHE_SECONDS = 24 * 60 * 60;
const FETCH_TIMEOUT_MS = 5_000;
const MAX_HTML_BYTES = 512 * 1_024;
const MAX_IMAGE_BYTES = 5 * 1_024 * 1_024;
const MAX_REDIRECTS = 3;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type LinkPreview = LinkPreviewMetadata & {
  url: string;
  hostname: string;
};

async function assertPublicDestination(url: URL): Promise<void> {
  const parsed = parseExternalHttpUrl(url.href);
  if (!parsed) throw new Error("Unsupported link preview URL");

  const addresses = await lookup(parsed.hostname, {
    all: true,
    verbatim: true,
  });

  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => isNonPublicIpAddress(address))
  ) {
    throw new Error("Link preview resolved to a non-public address");
  }
}

async function fetchPublicResponse(
  initialUrl: URL,
  accept: string,
): Promise<{ response: Response; finalUrl: URL }> {
  let currentUrl = initialUrl;

  for (
    let redirectCount = 0;
    redirectCount <= MAX_REDIRECTS;
    redirectCount += 1
  ) {
    await assertPublicDestination(currentUrl);

    const response = await fetch(currentUrl, {
      cache: "no-store",
      headers: {
        accept,
        "user-agent": "ych-blog-link-preview/1.0",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();

      if (!location || redirectCount === MAX_REDIRECTS) {
        throw new Error("Link preview exceeded the redirect limit");
      }

      currentUrl = new URL(location, currentUrl);
      continue;
    }

    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Link preview returned ${response.status}`);
    }

    return { response, finalUrl: currentUrl };
  }

  throw new Error("Link preview could not follow redirects");
}

async function fetchPublicHtml(
  initialUrl: URL,
): Promise<{ html: string; finalUrl: URL }> {
  const { response, finalUrl } = await fetchPublicResponse(
    initialUrl,
    "text/html,application/xhtml+xml",
  );

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("xhtml")) {
    await response.body?.cancel();
    throw new Error("Link preview response was not HTML");
  }

  return {
    html: await readLimitedResponseText(response, MAX_HTML_BYTES),
    finalUrl,
  };
}

async function readLimitedBytes(
  response: Response,
  maximumBytes: number,
): Promise<ArrayBuffer> {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > maximumBytes) {
    await response.body?.cancel();
    throw new Error("Link preview image was too large");
  }

  if (!response.body) return new ArrayBuffer(0);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      byteLength += value.byteLength;
      if (byteLength > maximumBytes) {
        throw new Error("Link preview image was too large");
      }

      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return bytes.buffer;
}

async function loadRemoteMetadata(url: string): Promise<LinkPreviewMetadata> {
  const initialUrl = parseExternalHttpUrl(url);
  if (!initialUrl) return {};

  if (initialUrl.origin === new URL(siteConfig.url).origin) {
    const match = initialUrl.pathname.match(/^\/posts\/(\d+)\/?$/);
    const post = match ? await getPost(Number(match[1])) : null;

    if (post?.published) {
      return {
        title: post.title,
        description: post.excerpt,
        image: post.coverImage.src || undefined,
        icon: new URL("/favicon.ico", siteConfig.url).href,
        siteName: siteConfig.name,
      };
    }
  }

  const { html, finalUrl } = await fetchPublicHtml(initialUrl);
  return parseLinkPreviewHtml(html, finalUrl);
}

const getCachedRemoteMetadata = unstable_cache(
  loadRemoteMetadata,
  ["external-link-preview-v5"],
  { revalidate: CACHE_SECONDS },
);

export async function getLinkPreview(
  value: string,
): Promise<LinkPreview | null> {
  const url = parseExternalHttpUrl(value);
  if (!url) return null;

  const fallback: LinkPreview = {
    url: url.href,
    hostname: url.hostname,
    title: url.hostname,
  };

  try {
    const metadata = await getCachedRemoteMetadata(url.href);
    return { ...fallback, ...metadata };
  } catch {
    return fallback;
  }
}

export async function fetchLinkPreviewImage(
  value: string,
): Promise<{ body: ArrayBuffer; contentType: string }> {
  const url = parseExternalHttpUrl(value);
  if (!url) throw new Error("Unsupported link preview image URL");

  const { response } = await fetchPublicResponse(
    url,
    "image/avif,image/webp,image/png,image/jpeg,image/gif",
  );
  const contentType =
    response.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase() ?? "";

  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    await response.body?.cancel();
    throw new Error("Link preview returned an unsupported image type");
  }

  return {
    body: await readLimitedBytes(response, MAX_IMAGE_BYTES),
    contentType,
  };
}
