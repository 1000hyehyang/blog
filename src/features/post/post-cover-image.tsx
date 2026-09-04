import Image, { type ImageProps } from "next/image";

import { canOptimizeImage } from "@/config/images";
import type { PostImage } from "@/domain/post";
import { cn } from "@/lib/utils";

type PostCoverImageProps = Omit<ImageProps, "src"> & {
  image: PostImage;
};

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

export function PostCoverImage({
  image,
  alt,
  className,
  fill,
  ...props
}: PostCoverImageProps) {
  if (!image.src) return <CoverPlaceholder className={className} fill={fill} />;

  return (
    <Image
      {...props}
      fill={fill}
      className={className}
      src={image.src}
      alt={alt}
      unoptimized={props.unoptimized ?? !canOptimizeImage(image.src)}
    />
  );
}
