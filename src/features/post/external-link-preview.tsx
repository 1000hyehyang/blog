import { getLinkPreview } from "@/infrastructure/link-preview/link-preview";
import { LinkPreviewCard } from "./link-preview-card";

export async function ExternalLinkPreview({ href }: { href: string }) {
  const preview = await getLinkPreview(href);
  if (!preview) return null;

  return <LinkPreviewCard preview={preview} />;
}
