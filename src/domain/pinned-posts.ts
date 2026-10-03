import { z } from "zod";
import { slugSchema, type FilePostSummary } from "@/lib/content/post-file";

export const pinnedOrderSchema = z.object({
  base: z.array(slugSchema).max(999),
  order: z.array(slugSchema).max(999),
});
export type PinnedOrder = z.infer<typeof pinnedOrderSchema>;
export type PinnedPost = Pick<FilePostSummary, "slug" | "title" | "coverImage">;

export function pinnedPosts(posts: FilePostSummary[]): PinnedPost[] {
  return posts
    .filter((post) => post.published && post.featured)
    .sort(compareFeaturedPosts)
    .map(({ slug, title, coverImage }) => ({ slug, title, coverImage }));
}

export function compareFeaturedPosts(a: FilePostSummary, b: FilePostSummary) {
  return (
    (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999) ||
    Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
    a.slug.localeCompare(b.slug, "en", { numeric: true })
  );
}

export const pinnedConflictSchema = z.object({
  kind: z.literal("pinned"),
  posts: z.array(
    z.object({
      slug: slugSchema,
      title: z.string(),
      coverImage: z.object({ src: z.string() }),
    }),
  ),
});

export function samePinnedOrder(a: string[], b: string[]) {
  return a.length === b.length && a.every((slug, index) => slug === b[index]);
}

// Keep deliberate local removals, discard remotely removed posts, and append
// remote additions. Applying local ordering is an explicit conflict resolution.
export function rebasePinnedOrder(
  base: string[],
  order: string[],
  latest: string[],
) {
  const allowed = new Set(latest);
  const previous = new Set(base);
  const result = order.filter((slug) => allowed.has(slug));
  const included = new Set(result);
  return [
    ...result,
    ...latest.filter((slug) => !previous.has(slug) && !included.has(slug)),
  ];
}
