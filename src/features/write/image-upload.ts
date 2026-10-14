import { uploadPresigned } from "@vercel/blob/client";
import {
  IMAGE_UPLOAD_EXTENSIONS,
  IMAGE_UPLOAD_TYPES,
  MAX_IMAGE_UPLOAD_BYTES,
} from "@/config/images";
import { readImageDimensions } from "@/lib/image-metadata";
import type { GroupImage } from "@/lib/image-group";

const MAX_PHOTO_EDGE = 5120;

export function imageFileError(file: File) {
  return !IMAGE_UPLOAD_TYPES.includes(file.type) ||
    !file.size ||
    file.size > MAX_IMAGE_UPLOAD_BYTES
    ? "20MB 이하의 PNG, JPEG, GIF, WebP, AVIF 이미지를 선택해 주세요."
    : "";
}

export async function uploadPostImage(
  file: File,
  category: string,
  postId: string,
): Promise<GroupImage> {
  const error = imageFileError(file);
  if (error) throw new Error(error);
  const source = URL.createObjectURL(file);
  const image = new Image();
  let upload: Blob = file;
  let dimensions;
  try {
    image.src = source;
    await image.decode();
    dimensions = readImageDimensions({
      width: image.naturalWidth,
      height: image.naturalHeight,
    });
    if (!dimensions) throw new Error("이미지 크기를 확인하지 못했습니다.");
    // Non-JPEG files keep text, transparency and animation without re-encoding.
    if (file.type === "image/jpeg") {
      const scale = Math.min(
        1,
        MAX_PHOTO_EDGE / Math.max(dimensions.width, dimensions.height),
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(dimensions.width * scale));
      canvas.height = Math.max(1, Math.round(dimensions.height * scale));
      try {
        const context = canvas.getContext("2d");
        if (context) {
          context.imageSmoothingQuality = "high";
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          const optimized = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/webp", 0.94),
          );
          if (
            optimized?.type === "image/webp" &&
            optimized.size > 0 &&
            optimized.size < file.size
          ) {
            upload = optimized;
            dimensions = { width: canvas.width, height: canvas.height };
          }
        }
      } catch {
        // Keep uploads working when the browser cannot encode the photo.
      } finally {
        canvas.width = canvas.height = 0;
      }
    }
  } finally {
    URL.revokeObjectURL(source);
  }
  const blob = await uploadPresigned(
    `posts/${category}/${postId}/${crypto.randomUUID()}.${IMAGE_UPLOAD_EXTENSIONS[upload.type]}`,
    upload,
    {
      access: "public",
      handleUploadUrl: "/api/write/images",
      contentType: upload.type,
    },
  );
  return {
    src: blob.url,
    alt: file.name.replace(/\.[^.]+$/, "").slice(0, 300),
    dimensions,
  };
}
