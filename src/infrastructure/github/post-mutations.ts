import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getCategoryNavigation } from "@/config/site";
import { createExcerpt } from "@/lib/content/excerpt";
import { applyPostEdit, postValidationMessage } from "@/domain/post-edit";
import {
  pinnedPosts,
  pinnedOrderRanks,
  pinnedOrderSchema,
  type PinnedOrder,
  samePinnedOrder,
} from "@/domain/pinned-posts";
import {
  parsePostFile,
  serializePostFile,
  slugSchema,
  postFieldsSchema,
  type FilePost,
} from "@/lib/content/post-file";
import {
  INDEX_PATH,
  gitShaSchema,
  blobSha,
  summarize,
  searchDocument,
  indexBucket,
  buildChunks,
  chunkPath,
  assertUniquePosts,
  type IndexManifest,
  type SearchDocument,
} from "@/lib/content/post-index";
import {
  PostStoreError,
  usesGitHubStorage,
  headRef,
  gitJson,
  readBlob,
  getStoredPost,
  snapshot,
  batches,
  readSearchChunk,
  commitFiles,
  readManifest,
} from "./post-store";

type Snapshot = Awaited<ReturnType<typeof snapshot>>;
async function indexChanges(
  state: Snapshot,
  changed: FilePost[],
  removed: string[] = [],
) {
  const edited = new Set([...removed, ...changed.map((post) => post.slug)]);
  const entries = [
    ...state.entries.filter(({ post }) => !edited.has(post.slug)),
    ...changed.map((post) => summarize(post, blobSha(serializePostFile(post)))),
  ];
  assertUniquePosts(entries);
  const catalog = buildChunks("catalog", entries);
  const buckets = new Set([...edited].map(indexBucket));
  const documents: SearchDocument[] = (
    await batches(
      state.manifest.search.filter(({ bucket }) => buckets.has(bucket)),
      ({ sha }) => readSearchChunk(sha),
    )
  )
    .flat()
    .filter(({ slug }) => !edited.has(slug));
  documents.push(
    ...changed.filter((post) => post.published).map(searchDocument),
  );
  const search = buildChunks("search", documents);
  const manifest: IndexManifest = {
    version: 1,
    catalog: catalog.refs,
    search: [
      ...state.manifest.search.filter(({ bucket }) => !buckets.has(bucket)),
      ...search.refs,
    ].sort(
      (a, b) => a.bucket.localeCompare(b.bucket) || a.sha.localeCompare(b.sha),
    ),
  };
  const oldFiles = new Set([
    ...state.manifest.catalog.map(({ sha }) => chunkPath("catalog", sha)),
    ...state.manifest.search.map(({ sha }) => chunkPath("search", sha)),
  ]);
  const currentFiles = new Set([
    ...manifest.catalog.map(({ sha }) => chunkPath("catalog", sha)),
    ...manifest.search.map(({ sha }) => chunkPath("search", sha)),
  ]);
  return {
    files: [...catalog.files, ...search.files]
      .filter(({ path }) => !oldFiles.has(path))
      .concat({ path: INDEX_PATH, content: JSON.stringify(manifest) }),
    removed: [...oldFiles].filter((file) => !currentFiles.has(file)),
  };
}
export async function savePost(
  slug: string,
  input: unknown,
  sha: string | null,
  pinned?: PinnedOrder,
) {
  if (!usesGitHubStorage())
    throw new PostStoreError(
      "글을 저장하려면 CONTENT_SOURCE=github 설정이 필요합니다.",
      503,
    );
  slugSchema.parse(slug);
  const fields = postFieldsSchema.parse(input);
  const navigation = getCategoryNavigation(fields.category.slug);
  const validationMessage = postValidationMessage(
    fields,
    navigation?.series ?? [],
  );
  if (validationMessage) throw new PostStoreError(validationMessage, 400);
  const ordering = pinned ? pinnedOrderSchema.parse(pinned) : undefined;
  const ref = await headRef();
  const previous = await getStoredPost(slug, ref);
  let matchingVersion = (previous?.sha ?? null) === sha;
  if (!matchingVersion && previous && sha && ordering) {
    // 고정 순서 변경도 SHA를 바꾸므로, 고정 정보 외의 변경 여부를 비교한다.
    try {
      const original = parsePostFile(await readBlob(sha), slug);
      matchingVersion =
        serializePostFile({
          ...original,
          featured: previous.post.featured,
          featuredOrder: previous.post.featuredOrder,
        }) === serializePostFile(previous.post);
    } catch {
      matchingVersion = false;
    }
  }
  if (!matchingVersion)
    throw new PostStoreError(
      "글이 변경되었거나 같은 주소가 이미 존재합니다. 내용을 보관하고 다시 열어 주세요.",
      409,
    );
  if (!fields.published && !(await gitJson("")).private)
    throw new PostStoreError(
      "공개 저장소에는 비공개로 저장할 수 없습니다. 임시 저장을 사용해 주세요.",
      400,
    );
  const now = new Date().toISOString();
  const post: FilePost = {
    ...applyPostEdit(previous?.post ?? null, fields, {
      slug,
      id:
        previous?.post.id ??
        z.object({ id: z.uuid().optional() }).parse(input).id ??
        randomUUID(),
      now,
      categoryName: navigation?.label ?? fields.category.name,
    }),
    excerpt: createExcerpt(fields.body),
  };
  const state = await snapshot(ref);
  const changed: FilePost[] = [post];
  if (ordering) {
    const currentPosts = pinnedPosts(state.entries.map(({ post }) => post));
    const current = currentPosts.map(({ slug }) => slug);
    if (!samePinnedOrder(current, ordering.base))
      throw new PostStoreError(
        "Pinned 목록이 변경되었습니다. 적용할 목록을 선택해 주세요. 작성 내용은 유지됩니다.",
        409,
        { kind: "pinned", posts: currentPosts },
      );
    const currentPinned = post.featured && post.published;
    const ranks = pinnedOrderRanks(post, current, ordering.order);
    if (!ranks)
      throw new PostStoreError("Pinned 목록이 올바르지 않습니다.", 400);
    post.featuredOrder = currentPinned ? ranks.get(slug) : undefined;
    for (const { post: summary, sha: storedSha } of state.entries) {
      if (summary.slug === slug) continue;
      const rank = ranks.get(summary.slug);
      if (
        !summary.featured ||
        (rank !== undefined && summary.featuredOrder === rank)
      )
        continue;
      const stored = await getStoredPost(summary.slug, ref);
      if (!stored || stored.sha !== storedSha)
        throw new PostStoreError(
          "Pinned 글이 변경되었습니다. 인덱스를 다시 생성해 주세요.",
          409,
        );
      changed.push({
        ...stored.post,
        featured: rank !== undefined,
        featuredOrder: rank,
      });
    }
  }
  const index = await indexChanges(state, changed);
  await commitFiles(
    ref,
    [
      ...changed.map((value) => ({
        path: `content/posts/${value.slug}.md`,
        content: serializePostFile(value),
      })),
      ...index.files,
    ],
    index.removed,
    `${previous ? "Update" : "Publish"} post and index: ${slug}`,
  );
  return {
    post,
    sha: blobSha(serializePostFile(post)),
    ...(ordering && { pinned: ordering.order }),
  };
}
export async function deletePost(slug: string, sha: string) {
  if (!usesGitHubStorage())
    throw new PostStoreError("GitHub 글쓰기 설정이 필요합니다.", 503);
  slugSchema.parse(slug);
  const ref = await headRef();
  const previous = await getStoredPost(slug, ref);
  if (!previous || previous.sha !== sha)
    throw new PostStoreError(
      "글이 변경되었습니다. 다시 열어 확인해 주세요.",
      409,
    );
  const index = await indexChanges(await snapshot(ref), [], [slug]);
  await commitFiles(
    ref,
    index.files,
    [...index.removed, `content/posts/${slug}.md`],
    `Delete post and index: ${slug}`,
  );
}
export async function rebuildPostIndex(source: {
  ref: string;
  posts: { post: FilePost; sha: string }[];
}) {
  if (!usesGitHubStorage())
    throw new PostStoreError("GitHub 콘텐츠 설정이 필요합니다.", 503);
  const ref = gitShaSchema.parse(source.ref);
  const manifest = await readManifest(ref);
  const entries = source.posts.map(({ post, sha }) => summarize(post, sha));
  assertUniquePosts(entries);
  const catalog = buildChunks("catalog", entries);
  const search = buildChunks(
    "search",
    source.posts
      .filter(({ post }) => post.published)
      .map(({ post }) => searchDocument(post)),
  );
  const next: IndexManifest = {
    version: 1,
    catalog: catalog.refs,
    search: search.refs,
  };
  const previous = new Set([
    ...(manifest?.catalog.map(({ sha }) => chunkPath("catalog", sha)) ?? []),
    ...(manifest?.search.map(({ sha }) => chunkPath("search", sha)) ?? []),
  ]);
  const files = [...catalog.files, ...search.files];
  const current = new Set(files.map(({ path }) => path));
  await commitFiles(
    ref,
    [
      ...files.filter(({ path }) => !previous.has(path)),
      { path: INDEX_PATH, content: JSON.stringify(next) },
    ],
    [...previous].filter((path) => !current.has(path)),
    "Rebuild post catalog and search index",
  );
  return {
    posts: source.posts.length,
    published: source.posts.filter(({ post }) => post.published).length,
  };
}
