import { z } from "zod";

export const metadataSchema = z.object({
  excerpt: z.string().trim().min(1).optional(),
  coverImage: z.string().url().optional(),
  galleryImage: z.string().url().optional(),
  featured: z.boolean().default(false),
  featuredOrder: z.coerce.number().int().nonnegative().optional(),
  published: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

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
