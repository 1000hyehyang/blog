"use client";

import type { ImageProps } from "next/image";
import { type ReactNode, type SyntheticEvent, useState } from "react";

import type { PostImage } from "@/domain/post";

import { resolveArtworkAspectRatio } from "./artwork-layout";
import { PostCoverImage } from "./post-cover-image";

type ArtworkFrameProps = {
  image: PostImage;
  children: ReactNode;
  loading?: ImageProps["loading"];
  sizes: string;
};

export function ArtworkFrame({
  image,
  children,
  loading,
  sizes,
}: ArtworkFrameProps) {
  const [aspectRatio, setAspectRatio] = useState(() =>
    resolveArtworkAspectRatio(),
  );

  function handleLoad(event: SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    setAspectRatio(resolveArtworkAspectRatio(naturalWidth, naturalHeight));
  }

  return (
    <div className="relative w-full" style={{ aspectRatio }}>
      <PostCoverImage
        image={image}
        alt=""
        fill
        loading={loading}
        sizes={sizes}
        onLoad={handleLoad}
        className="object-contain transition duration-500 group-hover:scale-[1.02]"
      />
      {children}
    </div>
  );
}
