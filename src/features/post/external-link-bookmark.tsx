import { ExternalLink, Globe2 } from "lucide-react";

import { getLinkPreview } from "@/infrastructure/link-preview/link-preview";

// 프리뷰 이미지 호스트는 콘텐츠마다 달라 next/image 허용 목록으로 제한할 수 없다.
export async function ExternalLinkBookmark({ href }: { href: string }) {
  const preview = await getLinkPreview(href);
  if (!preview) return null;

  return (
    <a
      className={
        preview.image
          ? "notion-bookmark notion-bookmark--with-cover"
          : "notion-bookmark"
      }
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      data-external-bookmark
    >
      <span className="notion-bookmark__content">
        <span className="notion-bookmark__text">
          <span className="notion-bookmark__title">{preview.title}</span>
          {preview.description && (
            <span className="notion-bookmark__description">
              {preview.description}
            </span>
          )}
        </span>
        <span className="notion-bookmark__meta">
          {preview.icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="notion-bookmark__favicon"
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
        <span className="notion-bookmark__cover" aria-hidden="true">
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
