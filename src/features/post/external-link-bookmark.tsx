import { ExternalLink, Globe2 } from "lucide-react";

import { getLinkPreview } from "@/infrastructure/link-preview/link-preview";

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
        <span className="notion-bookmark__title">{preview.title}</span>
        {preview.description && (
          <span className="notion-bookmark__description">
            {preview.description}
          </span>
        )}
        <span className="notion-bookmark__meta">
          {preview.icon ? (
            // 외부 favicon은 크기와 형식을 미리 알 수 없어 native img를 사용한다.
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
          {/* 외부 OG 이미지는 크기를 미리 알 수 없어 native img를 사용한다. */}
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
