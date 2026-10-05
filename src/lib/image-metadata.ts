// Markdown에서 지원하지 않는 이미지 속성은 title에 저장한다.
const prefix = "blog-image:v1:";

export type ImageAlignment = "left" | "center" | "right";
export type ImageDimensions = { width: number; height: number };

export function readImageDimensions(
  value: unknown,
): ImageDimensions | undefined {
  if (!value || typeof value !== "object") return undefined;
  const { width, height } = value as ImageDimensions;
  return Number.isSafeInteger(width) &&
    width > 0 &&
    Number.isSafeInteger(height) &&
    height > 0
    ? { width, height }
    : undefined;
}

export type ImageMetadata = {
  align: ImageAlignment;
  width: number;
  caption: string;
  title: string | null;
  batchId: string | null;
  dimensions?: ImageDimensions;
};

export function readImageMetadata(
  title: string | null | undefined,
): ImageMetadata {
  const fallback: ImageMetadata = {
    align: "center",
    width: 100,
    caption: "",
    title: title || null,
    batchId: null,
  };
  if (!title?.startsWith(prefix)) return fallback;
  try {
    const value = JSON.parse(decodeURIComponent(title.slice(prefix.length)));
    if (
      !["left", "center", "right"].includes(value.align) ||
      !Number.isInteger(value.width) ||
      value.width < 25 ||
      value.width > 100 ||
      typeof value.caption !== "string" ||
      value.caption.length > 300 ||
      (value.title !== null && typeof value.title !== "string") ||
      (value.batchId != null &&
        (typeof value.batchId !== "string" ||
          !/^[a-f0-9-]{36}$/.test(value.batchId)))
    )
      return fallback;
    return {
      ...value,
      batchId: value.batchId ?? null,
      dimensions: readImageDimensions(value.dimensions),
    };
  } catch {
    return fallback;
  }
}

export function writeImageMetadata(value: ImageMetadata): string | null {
  if (
    value.align === "center" &&
    value.width === 100 &&
    !value.caption &&
    !value.batchId &&
    !value.dimensions
  )
    return value.title;
  return prefix + encodeURIComponent(JSON.stringify(value));
}

export function hasImageSettings(
  value: Pick<ImageMetadata, "align" | "width" | "caption">,
) {
  return (
    value.align !== "center" || value.width !== 100 || Boolean(value.caption)
  );
}
