"use client";

import { useState } from "react";

export function LinkPreviewImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <span className="link-preview-card__image" aria-hidden="true">
      {/* The source is a same-origin endpoint that validates and proxies the remote image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
