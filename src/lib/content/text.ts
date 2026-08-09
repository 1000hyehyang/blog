const POST_METADATA_FIELDS = [
  "slug",
  "excerpt",
  "coverImage",
  "galleryImage",
  "featured",
  "featuredOrder",
  "published",
  "tags",
] as const;

const FRONTMATTER_FRAGMENT_PATTERN = new RegExp(
  `(?:${POST_METADATA_FIELDS.join("|")}):`,
);

const FRONTMATTER_LINE_PATTERN = new RegExp(
  `^(?:${POST_METADATA_FIELDS.join("|")}):`,
);

export function isBareHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function looksLikeFrontmatterFragment(value: string) {
  return FRONTMATTER_FRAGMENT_PATTERN.test(value);
}

export function isFrontmatterFieldLine(value: string) {
  const trimmed = value.trim();
  return trimmed === "---" || FRONTMATTER_LINE_PATTERN.test(trimmed);
}
