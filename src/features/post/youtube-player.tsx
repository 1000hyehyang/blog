"use client";

import { useHydrated } from "@/lib/react/use-hydrated";
import { buildYouTubeEmbedUrl, type YouTubeVideo } from "@/lib/youtube";

export function YouTubePlayer({
  video,
  title = "YouTube 영상",
}: {
  video: YouTubeVideo;
  title?: string;
}) {
  const hydrated = useHydrated();
  const embedUrl = buildYouTubeEmbedUrl(video.id);
  if (!embedUrl) return null;

  const player = (
    <iframe
      src={embedUrl}
      title={title}
      loading="lazy"
      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    />
  );

  return (
    <div className="youtube-player" data-youtube-player>
      {/* Hidden streaming chunks have no geometry for native lazy loading. */}
      {hydrated ? player : <noscript>{player}</noscript>}
    </div>
  );
}
