"use client";

import { Globe2 } from "lucide-react";
import { useState } from "react";

export function LinkPreviewFavicon({ src }: { src?: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <Globe2 className="link-preview-card__favicon" aria-hidden="true" />;
  }

  return (
    // Favicon URLs are discovered dynamically and cannot use a static next/image allowlist.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="link-preview-card__favicon"
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
