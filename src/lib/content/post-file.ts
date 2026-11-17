import {
  storedPostSchema as postFileSchema,
  type Post,
  type StoredPost,
} from "@/domain/post";
import { createExcerpt } from "./excerpt";
export {
  slugSchema,
  postFieldsSchema,
  storedPostSchema as postFileSchema,
} from "@/domain/post";
export type { StoredPost } from "@/domain/post";
export type FilePost = Post;
export type FilePostSummary = Omit<Post, "body">;

export function serializePostFile(value: StoredPost) {
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
    excerpt: createExcerpt(post.body),
  };
}
