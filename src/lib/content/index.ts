import { resolveExcerpt } from "./excerpt";
import { normalizeDiscussionSource, splitFrontmatterBlock } from "./frontmatter";
import { mergeMetadata, metadataSchema, resolveCoverImage } from "./metadata";
import { stripFrontmatterArtifacts } from "./sanitize";

export function parsePostBody(source: string) {
  const normalizedSource = normalizeDiscussionSource(source);
  const { raw, body: rawBody } = splitFrontmatterBlock(normalizedSource);
  const metadata = mergeMetadata(raw);
  const coverImage = resolveCoverImage(metadata.coverImage);
  const body = stripFrontmatterArtifacts(rawBody.trim(), coverImage);
  const valid = metadataSchema.safeParse(raw).success;

  return {
    body,
    metadata: {
      ...metadata,
      excerpt: resolveExcerpt(metadata.excerpt, body, coverImage),
      coverImage,
    },
    valid,
  };
}

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

export function formatDateTime(value: string, locale = "ko-KR") {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(value));
}

/** 본문이 발행 시각 이후에 편집됐을 때만 true */
export function hasPostUpdate(
  createdAt: string,
  modifiedAt: string | null | undefined,
) {
  if (!modifiedAt) return false;
  return new Date(modifiedAt).getTime() > new Date(createdAt).getTime();
}

export function resolvePostModifiedAt(post: {
  createdAt: string;
  lastEditedAt: string | null;
}) {
  return post.lastEditedAt ?? post.createdAt;
}

export type PostHeading = {
  level: 1 | 2 | 3;
  text: string;
  id: string;
};

/** 마크다운 본문에서 목차용 h1~h3 헤딩을 추출한다. */
export function extractHeadings(markdown: string): PostHeading[] {
  return [...markdown.matchAll(/^(#{1,3})\s+(.+)$/gm)].map((match) => ({
    level: match[1].length as 1 | 2 | 3,
    text: match[2],
    id: toSlug(match[2]),
  }));
}
