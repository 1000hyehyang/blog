const prefix = "blog-image:v1:";
// Markdown 이미지 문법에 없는 크기·정렬·캡션·묶음 식별자를 title에 기록한다.

export type ImageAlignment = "left" | "center" | "right";
export type ImageMetadata = {
  align: ImageAlignment;
  width: number;
  caption: string;
  title: string | null;
  batchId: string | null;
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
    return { ...value, batchId: value.batchId ?? null };
  } catch {
    return fallback;
  }
}

export function writeImageMetadata(value: ImageMetadata): string | null {
  if (
    value.align === "center" &&
    value.width === 100 &&
    !value.caption &&
    !value.batchId
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
