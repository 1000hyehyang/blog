import { ExternalLink, Globe2 } from "lucide-react";

import { getLinkPreview } from "@/infrastructure/link-preview/link-preview";

export async function ExternalLinkPreview({ href }: { href: string }) {
  const preview = await getLinkPreview(href);
  if (!preview) return null;

  const className = preview.image
    ? "link-preview-card link-preview-card--with-image"
    : "link-preview-card";

  return (
    <a
      className={className}
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      data-link-preview
    >
      <span className="link-preview-card__content">
        <span className="link-preview-card__text">
          <span className="link-preview-card__title">{preview.title}</span>
          {preview.description && (
            <span className="link-preview-card__description">
              {preview.description}
            </span>
          )}
        </span>
        <span className="link-preview-card__meta">
          {preview.icon ? (
            // 미리보기 이미지 호스트는 동적으로 결정되어 next/image 허용 목록으로 제한할 수 없다.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="link-preview-card__favicon"
              src={preview.icon}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <Globe2 aria-hidden="true" />
          )}
          <span>{preview.siteName || preview.hostname}</span>
          <ExternalLink aria-hidden="true" />
        </span>
      </span>

      {preview.image && (
        <span className="link-preview-card__image" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.image}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </span>
      )}
    </a>
  );
}
