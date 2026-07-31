const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const SHORT_HOSTS = new Set(["youtu.be", "www.youtu.be"]);
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

export type YouTubeVideo = {
  id: string;
};

function normalizeVideoId(value: string | null | undefined): string | null {
  const candidate = value?.trim() ?? "";
  return YOUTUBE_VIDEO_ID.test(candidate) ? candidate : null;
}

function getPathVideoId(url: URL): string | null {
  const segments = url.pathname.split("/").filter(Boolean);

  if (SHORT_HOSTS.has(url.hostname)) {
    return normalizeVideoId(segments[0]);
  }

  if (url.pathname === "/watch") {
    return normalizeVideoId(url.searchParams.get("v"));
  }

  if (["embed", "shorts", "live"].includes(segments[0] ?? "")) {
    return normalizeVideoId(segments[1]);
  }

  return null;
}

export function parseYouTubeUrl(value: string): YouTubeVideo | null {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (!SHORT_HOSTS.has(hostname) && !YOUTUBE_HOSTS.has(hostname))
    ) {
      return null;
    }

    const id = getPathVideoId(url);
    return id ? { id } : null;
  } catch {
    return null;
  }
}

export function buildYouTubeEmbedUrl(videoId: string): string | null {
  const id = normalizeVideoId(videoId);
  return id
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0`
    : null;
}

export function buildYouTubeWatchUrl(videoId: string): string | null {
  const id = normalizeVideoId(videoId);
  return id
    ? `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`
    : null;
}
