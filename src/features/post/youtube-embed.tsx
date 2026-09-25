import { getYouTubeMetadata } from "@/infrastructure/youtube/youtube";
import type { YouTubeVideo } from "@/lib/youtube";
import { YouTubePlayer } from "./youtube-player";

export async function YouTubeEmbed({ video }: { video: YouTubeVideo }) {
  const metadata = await getYouTubeMetadata(video.id);
  return <YouTubePlayer video={video} title={metadata?.title} />;
}
