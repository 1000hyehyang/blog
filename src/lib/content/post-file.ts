import { z } from "zod";

import { resolveExcerpt } from "./excerpt";

// JSON is a YAML subset: strict frontmatter avoids executable MDX and YAML coercion.
export const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .refine((s) => !/^\d+$/.test(s), "숫자만으로 된 주소는 사용할 수 없습니다.");
const imageUrl = z.union([
  z.literal(""),
  z
    .string()
    .url()
    .refine((s) => /^https?:\/\//.test(s)),
]);
export const postFieldsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().max(200_000),
  category: z.object({
    name: z.string().trim().min(1).max(100),
    slug: z.string().regex(/^[a-z0-9-]+$/),
  }),
  tags: z.array(z.string().trim().min(1).max(80)).max(30),
  excerpt: z.string().max(1000).default(""),
  coverImage: z.object({ src: imageUrl }),
  galleryImage: z.object({ src: imageUrl }).optional(),
  featured: z.boolean(),
  featuredOrder: z.number().int().nonnegative().optional(),
  published: z.boolean(),
});
export const postFileSchema = postFieldsSchema.extend({
  slug: slugSchema,
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  lastEditedAt: z.string().datetime().nullable(),
  commentsCount: z.number().int().nonnegative().default(0),
  reactionsCount: z.number().int().nonnegative().default(0),
});
export type FilePost = z.infer<typeof postFileSchema>;

export function nextPostSlug(slugs: string[]) {
  let latest = 0;
  for (const slug of slugs) {
    const match = /^post-([1-9]\d*)$/.exec(slug);
    if (match) latest = Math.max(latest, Number(match[1]));
  }
  return `post-${latest + 1}`;
}

export function serializePostFile(value: FilePost) {
  const { body, ...metadata } = postFileSchema.parse(value);
  return `---\n${JSON.stringify(metadata, null, 2)}\n---\n${body}`;
}

export function parsePostFile(source: string, slug: string): FilePost {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source);
  if (!match) throw new Error(`Invalid post frontmatter: ${slug}`);
  const post = postFileSchema.parse({
    ...JSON.parse(match[1]),
    body: source.slice(match[0].length),
  });
  if (post.slug !== slug)
    throw new Error(`Post filename does not match slug: ${slug}`);
  return {
    ...post,
    excerpt: resolveExcerpt(post.excerpt, post.body, post.coverImage.src),
  };
}
