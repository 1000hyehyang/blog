import "server-only";
import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { withCommentCounts } from "./comment-counts";
import { getCategoryNavigation } from "@/config/site";
import { parsePostFile } from "@/lib/content/post-file";
import type { Post } from "@/domain/post";
import {
  summarize,
  searchDocument,
  matchingSearchSlugs,
  type IndexManifest,
  type CatalogEntry,
} from "@/lib/content/post-index";
import {
  usesGitHubStorage,
  readManifest,
  headRef,
  readCatalogChunk,
  readSearchChunk,
  readBlob,
  sortCatalog,
  batches,
  readLocalPosts,
  getStoredPost,
} from "./post-store";

const localPosts = cache(readLocalPosts);
const publicManifest = cache(async () => {
  if (!usesGitHubStorage()) return null;
  return cachedManifest();
});
async function cachedManifest(): Promise<IndexManifest> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });
  cacheTag("posts");
  const manifest = await readManifest();
  if (manifest) return manifest;
  await headRef();
  return { version: 1, catalog: [], search: [] };
}
async function publicCatalogChunk(sha: string) {
  "use cache";
  cacheLife("max");
  return (await readCatalogChunk(sha)).filter(({ post }) => post.published);
}
async function publicSearchChunk(sha: string) {
  "use cache";
  cacheLife("max");
  return readSearchChunk(sha);
}
async function matchingSlugs(shas: string[], query: string) {
  "use cache";
  cacheLife({ stale: 30, revalidate: 300, expire: 3600 });
  return matchingSearchSlugs(
    (await batches(shas, publicSearchChunk)).flat(),
    query,
  );
}
async function publicBody(slug: string, sha: string) {
  "use cache";
  cacheLife("max");
  const post = parsePostFile(await readBlob(sha), slug);
  return post.published ? post : null;
}
const publicCatalog = cache(async () => {
  const manifest = await publicManifest();
  const entries = manifest
    ? (
        await batches(manifest.catalog, ({ sha }) => publicCatalogChunk(sha))
      ).flat()
    : (await localPosts())
        .filter(({ post }) => post.published)
        .map(({ post, sha }) => summarize(post, sha));
  return sortCatalog(entries).map((entry) => ({
    ...entry,
    post: withCategoryName(entry.post),
  }));
});
const catalogById = cache(
  async () =>
    new Map((await publicCatalog()).map((entry) => [entry.post.id, entry])),
);

function withCategoryName<T extends Pick<Post, "category">>(post: T): T {
  return {
    ...post,
    category: {
      ...post.category,
      name:
        getCategoryNavigation(post.category.slug)?.label ?? post.category.name,
    },
  };
}

export async function getAllPosts(
  options: { category?: string; series?: string } = {},
) {
  return (await publicCatalog())
    .filter(
      ({ post }) =>
        (!options.category || post.category.slug === options.category) &&
        (!options.series || post.series === options.series),
    )
    .map(({ post }) => post);
}
export async function getPostSummary(postId: string) {
  return (await catalogById()).get(postId)?.post ?? null;
}
export const getPostContent = cache(async (postId: string) => {
  const entry = (await catalogById()).get(postId);
  return entry ? readPostContent(entry) : null;
});
async function readPostContent(entry: CatalogEntry) {
  const post = usesGitHubStorage()
    ? await publicBody(entry.post.slug, entry.sha)
    : (await getStoredPost(entry.post.slug))?.post;
  return post?.published && post.id === entry.post.id
    ? withCategoryName(post)
    : null;
}
export async function getRecentPostContents(limit: number) {
  return batches((await publicCatalog()).slice(0, limit), readPostContent);
}
function paginate<T extends { slug: string }>(
  posts: T[],
  options: { first?: number; after?: string },
) {
  const cursor = options.after
    ? posts.findIndex((post) => post.slug === options.after) + 1
    : 0;
  const start = options.after && cursor === 0 ? posts.length : cursor;
  const count = Number.isFinite(options.first)
    ? Math.max(1, Math.min(Math.floor(options.first!), 50))
    : 12;
  const page = posts.slice(start, start + count);
  const hasNextPage = start + page.length < posts.length;
  return {
    posts: page,
    totalCount: posts.length,
    pageInfo: {
      hasNextPage,
      endCursor: hasNextPage ? page.at(-1)!.slug : null,
    },
  };
}
export async function getPosts(
  options: {
    first?: number;
    after?: string;
    sort?: "latest" | "oldest";
    category?: string;
    series?: string;
  } = {},
) {
  const posts = await getAllPosts(options);
  if (options.sort === "oldest") posts.reverse();
  const result = paginate(posts, options);
  return { ...result, posts: await withCommentCounts(result.posts) };
}
export async function searchPosts(
  query: string,
  options: { first?: number; after?: string } = {},
) {
  const normalized =
    typeof query === "string" ? query.trim().toLocaleLowerCase() : "";
  if (!normalized) return paginate([], options);
  const manifest = await publicManifest();
  const matches = new Set<string>();
  if (manifest) {
    for (const slug of await matchingSlugs(
      manifest.search.map(({ sha }) => sha),
      normalized,
    ))
      matches.add(slug);
  } else {
    for (const { post } of await localPosts())
      if (post.published && searchDocument(post).text.includes(normalized))
        matches.add(post.slug);
  }
  const result = paginate(
    (await getAllPosts()).filter((post) => matches.has(post.slug)),
    options,
  );
  return { ...result, posts: await withCommentCounts(result.posts) };
}
