export function toSlug(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-|-$/g, "");
}

const DISPLAY_TIME_ZONE = "Asia/Seoul";

export function formatDate(value: string, locale = "ko-KR") {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(value));
}

export function formatNumericDate(value: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(value));
}

export function resolvePostPublishedAt(post: {
  createdAt: string;
  publishedAt?: string | null;
}) {
  return post.publishedAt ?? post.createdAt;
}

export function resolvePostModifiedAt(post: {
  createdAt: string;
  publishedAt?: string | null;
  lastEditedAt: string | null;
}) {
  return post.lastEditedAt ?? resolvePostPublishedAt(post);
}

export type MarkdownHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export function toBodyHeadingLevel(
  level: MarkdownHeadingLevel,
): MarkdownHeadingLevel {
  return Math.min(level + 1, 6) as MarkdownHeadingLevel;
}

export type PostHeading = {
  level: 1 | 2 | 3;
  text: string;
  id: string;
};
