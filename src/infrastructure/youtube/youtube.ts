import "server-only";

import { unstable_cache } from "next/cache";
import { z } from "zod";

import { buildYouTubeWatchUrl } from "@/lib/youtube";

const CACHE_SECONDS = 24 * 60 * 60;
const FETCH_TIMEOUT_MS = 4_000;
const MAX_RESPONSE_LENGTH = 64 * 1_024;
const OEMBED_ENDPOINT = "https://www.youtube.com/oembed";

const oEmbedSchema = z.object({
  title: z.string(),
});

type YouTubeMetadata = {
  title: string;
};

function normalizeMetadataText(value: string, maxLength: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

async function loadYouTubeMetadata(
  videoId: string,
): Promise<YouTubeMetadata | null> {
  const watchUrl = buildYouTubeWatchUrl(videoId);
  if (!watchUrl) return null;

  const endpoint = new URL(OEMBED_ENDPOINT);
  endpoint.searchParams.set("url", watchUrl);
  endpoint.searchParams.set("format", "json");

  const response = await fetch(endpoint, {
    cache: "no-store",
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) return null;

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_RESPONSE_LENGTH) return null;

  const source = await response.text();
  if (source.length > MAX_RESPONSE_LENGTH) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(source);
  } catch {
    return null;
  }

  const result = oEmbedSchema.safeParse(payload);
  if (!result.success) return null;

  const title = normalizeMetadataText(result.data.title, 180);
  return title ? { title } : null;
}

const getCachedYouTubeMetadata = unstable_cache(
  loadYouTubeMetadata,
  ["youtube-oembed-v1"],
  { revalidate: CACHE_SECONDS },
);

export async function getYouTubeMetadata(
  videoId: string,
): Promise<YouTubeMetadata | null> {
  try {
    return await getCachedYouTubeMetadata(videoId);
  } catch {
    return null;
  }
}
