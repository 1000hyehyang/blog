"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

type PostCoverImageProps = Omit<ImageProps, "src" | "onError"> & {
  src?: string | null;
};

function resolveImageSrc(src?: string | null) {
  const value = src?.trim();
  if (!value) return null;

  try {
    if (value.startsWith("/")) return value;
    new URL(value);
    return value;
  } catch {
    return null;
  }
}

function CoverPlaceholder({
  className,
  fill,
}: {
  className?: string;
  fill?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "bg-background",
        fill && "absolute inset-0 size-full",
        className,
      )}
    />
  );
}

function PostCoverImageInner({
  resolvedSrc,
  alt,
  className,
  fill,
  priority,
  loading,
  ...props
}: Omit<PostCoverImageProps, "src"> & { resolvedSrc: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <CoverPlaceholder className={className} fill={fill} />;
  }

  return (
    <Image
      {...props}
      fill={fill}
      className={className}
      src={resolvedSrc}
      alt={alt}
      priority={priority}
      loading={priority ? "eager" : loading}
      onError={() => setFailed(true)}
    />
  );
}

export function PostCoverImage({ src, alt, ...props }: PostCoverImageProps) {
  const resolvedSrc = resolveImageSrc(src);

  if (!resolvedSrc) {
    return <CoverPlaceholder className={props.className} fill={props.fill} />;
  }

  return (
    <PostCoverImageInner
      key={resolvedSrc}
      resolvedSrc={resolvedSrc}
      alt={alt}
      {...props}
    />
  );
}
