import { buildYouTubeEmbedUrl, type YouTubeVideo } from "@/lib/youtube";

export function YouTubePlayer({
  video,
  title = "YouTube 영상",
}: {
  video: YouTubeVideo;
  title?: string;
}) {
  const embedUrl = buildYouTubeEmbedUrl(video.id);
  if (!embedUrl) return null;

  return (
    <div className="youtube-player" data-youtube-player>
      <iframe
        src={embedUrl}
        title={title}
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}
