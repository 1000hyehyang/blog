const prefix = "blog-image-group:v1:";

export type ImageGroupLayout = "individual" | "collage" | "slide";
export type GroupImage = { src: string; alt: string };
export type ImageGroup = {
  layout: ImageGroupLayout;
  images: GroupImage[];
  caption?: string;
};

export function asImageGroup(value: unknown): ImageGroup | null {
  if (!value || typeof value !== "object") return null;
  const group = value as Partial<ImageGroup>;
  if (
    !["individual", "collage", "slide"].includes(group.layout ?? "") ||
    !Array.isArray(group.images) ||
    group.images.length < 2 ||
    group.images.length > 50 ||
    (group.caption !== undefined &&
      (typeof group.caption !== "string" || group.caption.length > 300)) ||
    !group.images.every(
      (image) =>
        image &&
        typeof image.src === "string" &&
        (/^https?:\/\//.test(image.src) || /^\/(?!\/)/.test(image.src)) &&
        typeof image.alt === "string" &&
        image.alt.length <= 300,
    )
  )
    return null;
  return {
    layout: group.layout as ImageGroupLayout,
    images: group.images as GroupImage[],
    ...(group.caption ? { caption: group.caption } : {}),
  };
}

export function readImageGroup(title: string | null | undefined) {
  if (!title?.startsWith(prefix)) return null;
  try {
    return asImageGroup(
      JSON.parse(decodeURIComponent(title.slice(prefix.length))),
    );
  } catch {
    return null;
  }
}

export function writeImageGroup(group: ImageGroup) {
  return prefix + encodeURIComponent(JSON.stringify(group));
}
