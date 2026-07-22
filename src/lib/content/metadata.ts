import { z } from "zod";

function emptyToUndefined(value: unknown) {
  if (value === "" || value === null) return undefined;
  return value;
}

function coerceBoolean(value: unknown) {
  if (value === true || value === "true" || value === "True") return true;
  if (value === false || value === "false" || value === "False") return false;
  return value;
}

export const metadataSchema = z.object({
  slug: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  excerpt: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  coverImage: z.preprocess(emptyToUndefined, z.string().url().optional()),
  featured: z.preprocess(coerceBoolean, z.boolean().default(false)),
  featuredOrder: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().nonnegative().optional(),
  ),
  published: z.preprocess(
    (value) => (value === undefined ? true : coerceBoolean(value)),
    z.boolean().default(true),
  ),
  tags: z.array(z.string()).default([]),
});

export type PostMetadata = z.infer<typeof metadataSchema>;

export function mergeMetadata(raw: Record<string, unknown>): PostMetadata {
  const result = metadataSchema.safeParse(raw);
  if (result.success) return result.data;

  const fallback = metadataSchema.parse({});
  const partial = metadataSchema.safeParse({
    ...fallback,
    featured: raw.featured ?? fallback.featured,
    featuredOrder: raw.featuredOrder ?? fallback.featuredOrder,
    published: raw.published ?? fallback.published,
    slug: emptyToUndefined(raw.slug),
    excerpt: emptyToUndefined(raw.excerpt),
    coverImage: emptyToUndefined(raw.coverImage),
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((tag): tag is string => typeof tag === "string")
      : fallback.tags,
  });

  return partial.success ? partial.data : fallback;
}

export function resolveCoverImage(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  try {
    if (trimmed.startsWith("/")) return trimmed;
    new URL(trimmed);
    return trimmed;
  } catch {
    return "";
  }
}
