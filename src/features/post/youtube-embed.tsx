import { getYouTubeMetadata } from "@/infrastructure/youtube/youtube";
import { buildYouTubeEmbedUrl, type YouTubeVideo } from "@/lib/youtube";

export async function YouTubeEmbed({ video }: { video: YouTubeVideo }) {
  const embedUrl = buildYouTubeEmbedUrl(video.id);
  if (!embedUrl) return null;

  const metadata = await getYouTubeMetadata(video.id);

  return (
    <div className="youtube-player" data-youtube-player>
      <iframe
        src={embedUrl}
        title={metadata?.title ?? "YouTube 영상"}
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}
