import { z } from "zod";
import { slugSchema, type FilePostSummary } from "@/lib/content/post-file";
import { getFeaturedPosts } from "@/features/post/post-queries";

export const pinnedOrderSchema = z.object({
  base: z.array(slugSchema).max(999),
  order: z.array(slugSchema).max(999),
});
export type PinnedOrder = z.infer<typeof pinnedOrderSchema>;
export type PinnedPost = Pick<FilePostSummary, "slug" | "title" | "coverImage">;

export function pinnedPosts(posts: FilePostSummary[]): PinnedPost[] {
  return getFeaturedPosts(posts.filter((post) => post.published)).map(
    ({ slug, title, coverImage }) => ({ slug, title, coverImage }),
  );
}
