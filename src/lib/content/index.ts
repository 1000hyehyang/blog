import { resolveExcerpt } from "./excerpt";
import {
  normalizeDiscussionSource,
  splitFrontmatterBlock,
} from "./frontmatter";
import { mergeMetadata, metadataSchema, resolveCoverImage } from "./metadata";
import { stripFrontmatterArtifacts } from "./sanitize";

export function parsePostBody(source: string) {
  const normalizedSource = normalizeDiscussionSource(source);
  const { raw, body: rawBody } = splitFrontmatterBlock(normalizedSource);
  const metadata = mergeMetadata(raw);
  const coverImage = resolveCoverImage(metadata.coverImage);
  const galleryImage = resolveCoverImage(metadata.galleryImage);
  const body = stripFrontmatterArtifacts(rawBody.trim(), [
    coverImage,
    galleryImage,
  ]);
  const valid = metadataSchema.safeParse(raw).success;

  return {
    body,
    metadata: {
      ...metadata,
      excerpt: resolveExcerpt(metadata.excerpt, body, coverImage),
      coverImage,
      galleryImage,
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

export function resolvePostModifiedAt(post: {
  createdAt: string;
  lastEditedAt: string | null;
}) {
  return post.lastEditedAt ?? post.createdAt;
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

function stripInlineMarkdown(value: string) {
  return value
    .replace(/!\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/<((?:https?:\/\/|mailto:)[^>]+)>/g, "$1")
    .replace(/\\([\\`*{}[\]()#+\-.!_>~])/g, "$1")
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractHeadings(markdown: string): PostHeading[] {
  return [...markdown.matchAll(/^(#{1,3})\s+(.+)$/gm)].map((match) => {
    const text = stripInlineMarkdown(match[2]);

    return {
      level: match[1].length as 1 | 2 | 3,
      text,
      id: toSlug(text),
    };
  });
}
