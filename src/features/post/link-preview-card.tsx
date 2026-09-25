import {
  getLinkPreviewImagePath,
  type LinkPreviewMetadata,
} from "@/lib/link-preview";

import { LinkPreviewFavicon } from "./link-preview-favicon";
import { LinkPreviewImage } from "./link-preview-image";

export type LinkPreviewCardData = LinkPreviewMetadata & {
  url: string;
  hostname: string;
};

export function LinkPreviewCard({ preview }: { preview: LinkPreviewCardData }) {
  return (
    <a
      className="link-preview-card"
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      data-link-preview
    >
      {preview.image && (
        <LinkPreviewImage src={getLinkPreviewImagePath(preview.url)} />
      )}
      <span className="link-preview-card__content">
        <span className="link-preview-card__site">
          <LinkPreviewFavicon src={preview.icon} />
          <span>{preview.siteName || preview.hostname}</span>
        </span>
        <span className="link-preview-card__text">
          <span className="link-preview-card__title">
            {preview.title || preview.hostname}
          </span>
          {preview.description && (
            <span className="link-preview-card__description">
              {preview.description}
            </span>
          )}
        </span>
        <span className="link-preview-card__url">{preview.url}</span>
      </span>
    </a>
  );
}
