import { uploadPresigned } from "@vercel/blob/client";
import {
  IMAGE_UPLOAD_EXTENSIONS,
  IMAGE_UPLOAD_TYPES,
  MAX_IMAGE_UPLOAD_BYTES,
} from "@/config/images";
import { readImageDimensions } from "@/lib/image-metadata";
import type { GroupImage } from "@/lib/image-group";

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
  let dimensions;
  try {
    image.src = source;
    await image.decode();
    dimensions = readImageDimensions({
      width: image.naturalWidth,
      height: image.naturalHeight,
    });
    if (!dimensions) throw new Error("이미지 크기를 확인하지 못했습니다.");
  } finally {
    URL.revokeObjectURL(source);
  }
  const blob = await uploadPresigned(
    `posts/${category}/${postId}/${crypto.randomUUID()}.${IMAGE_UPLOAD_EXTENSIONS[file.type]}`,
    file,
    {
      access: "public",
      handleUploadUrl: "/api/write/images",
      contentType: file.type,
    },
  );
  return {
    src: blob.url,
    alt: file.name.replace(/\.[^.]+$/, "").slice(0, 300),
    dimensions,
  };
}
