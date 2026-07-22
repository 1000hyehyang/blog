import matter from "gray-matter";
import { z } from "zod";

import { siteConfig } from "@/config/site";

const metadataSchema = z.object({
  slug: z.string().trim().min(1).optional(),
  excerpt: z.string().trim().min(1).optional(),
  coverImage: z.string().url().optional(),
  featured: z.boolean().default(false),
  featuredOrder: z.number().int().nonnegative().optional(),
  published: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
});

export type PostMetadata = z.infer<typeof metadataSchema>;

function normalizeDiscussionSource(source: string) {
  const lines = source.split("\n");
  const frontmatterIndex = lines.findIndex((line) => line.trim() === "---");
  if (frontmatterIndex > 0) {
    return lines.slice(frontmatterIndex).join("\n");
  }
  return source;
}

export function createExcerpt(markdown: string, length = 150) {
  const plainText = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plainText.length > length
    ? `${plainText.slice(0, length).trim()}…`
    : plainText;
}

export function parsePostBody(source: string) {
  const normalizedSource = normalizeDiscussionSource(source);

  try {
    const parsed = matter(normalizedSource);
    const result = metadataSchema.safeParse(parsed.data);
    const metadata = result.success ? result.data : metadataSchema.parse({});

    return {
      body: parsed.content.trim(),
      metadata: {
        ...metadata,
        excerpt: metadata.excerpt ?? createExcerpt(parsed.content),
        coverImage: metadata.coverImage ?? siteConfig.defaultImage,
      },
      valid: result.success,
    };
  } catch {
    const fallbackBody = normalizeDiscussionSource(source)
      .replace(/^---[\s\S]*?---/, "")
      .trim();
    return {
      body: fallbackBody,
      metadata: {
        ...metadataSchema.parse({}),
        excerpt: createExcerpt(fallbackBody),
        coverImage: siteConfig.defaultImage,
      },
      valid: false,
    };
  }
}

export function toSlug(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-|-$/g, "");
}

export function formatDate(value: string, locale = "ko-KR") {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
