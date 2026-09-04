import "server-only";

import { z } from "zod";

import type { Post, PostPage } from "@/domain/post";
import { parsePostBody, toSlug } from "@/lib/content";

const GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql";
// 웹훅 누락에 대비해 주기적 재검증도 유지한다.
const REVALIDATE_SECONDS = 3600;
const MAX_PAGE_SIZE = 50;

const envSchema = z.object({
  GITHUB_TOKEN: z.string().min(1),
  GITHUB_OWNER: z.string().min(1),
  GITHUB_REPO: z.string().min(1),
});

type GitHubConfig = z.infer<typeof envSchema>;

type ReactionGroup = { users: { totalCount: number } };
type DiscussionNode = {
  id: string;
  number: number;
  title: string;
  body: string;
  author: { login: string } | null;
  createdAt: string;
  lastEditedAt: string | null;
  category: { name: string };
  comments: { totalCount: number };
  reactionGroups: ReactionGroup[];
};

type DiscussionListData = {
  repository: {
    discussions: {
      nodes: DiscussionNode[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  };
};

type DiscussionDetailData = {
  repository: { discussion: DiscussionNode | null };
};

const DISCUSSION_FIELDS = `
  id number title body createdAt lastEditedAt
  author { login }
  category { name }
  comments { totalCount }
  reactionGroups { users { totalCount } }
`;

const LIST_QUERY = `
  query Posts($owner: String!, $repo: String!, $first: Int!, $after: String, $direction: OrderDirection!) {
    repository(owner: $owner, name: $repo) {
      discussions(first: $first, after: $after, orderBy: {field: CREATED_AT, direction: $direction}) {
        pageInfo { hasNextPage endCursor }
        nodes { ${DISCUSSION_FIELDS} }
      }
    }
  }
`;

const DETAIL_QUERY = `
  query Post($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      discussion(number: $number) { ${DISCUSSION_FIELDS} }
    }
  }
`;

function getConfig(): GitHubConfig | null {
  const result = envSchema.safeParse(process.env);
  return result.success ? result.data : null;
}

export function isGitHubConfigured() {
  return getConfig() !== null;
}

async function request<T>(
  config: GitHubConfig,
  query: string,
  variables: Record<string, unknown>,
  tags: string[] = ["posts"],
): Promise<T> {
  const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: REVALIDATE_SECONDS, tags },
  });

  if (!response.ok) throw new Error("콘텐츠 제공자에 연결할 수 없습니다.");
  const payload = (await response.json()) as { data?: T; errors?: unknown[] };
  if (!payload.data || payload.errors?.length) {
    throw new Error("콘텐츠를 불러오지 못했습니다.");
  }
  return payload.data;
}

function countReactions(groups: ReactionGroup[] = []) {
  return groups.reduce((total, group) => total + group.users.totalCount, 0);
}

function mapDiscussion(node: DiscussionNode, owner: string): Post {
  const { body, metadata, valid } = parsePostBody(node.body);

  if (!valid) {
    console.warn(
      `[content] Discussion #${node.number} has an invalid post form; using safe defaults.`,
    );
  }

  return {
    id: node.id,
    number: node.number,
    title: node.title,
    body,
    excerpt: metadata.excerpt,
    coverImage: {
      src: metadata.coverImage,
    },
    galleryImage: metadata.galleryImage
      ? { src: metadata.galleryImage }
      : undefined,
    featured: metadata.featured,
    featuredOrder: metadata.featuredOrder,
    published:
      valid &&
      node.author?.login.toLowerCase() === owner.toLowerCase() &&
      metadata.published,
    tags: metadata.tags,
    category: {
      name: node.category.name,
      slug: toSlug(node.category.name),
    },
    createdAt: node.createdAt,
    lastEditedAt: node.lastEditedAt,
    commentsCount: node.comments.totalCount,
    reactionsCount: countReactions(node.reactionGroups),
  };
}

export async function getPosts(
  options: {
    first?: number;
    after?: string;
    category?: string;
    sort?: "latest" | "oldest";
  } = {},
): Promise<PostPage> {
  const config = getConfig();
  if (!config) {
    return { posts: [], pageInfo: { hasNextPage: false, endCursor: null } };
  }

  const data = await request<DiscussionListData>(config, LIST_QUERY, {
    owner: config.GITHUB_OWNER,
    repo: config.GITHUB_REPO,
    first: Math.min(options.first ?? 12, MAX_PAGE_SIZE),
    after: options.after ?? null,
    direction: options.sort === "oldest" ? "ASC" : "DESC",
  });

  const posts = data.repository.discussions.nodes
    .map((node) => mapDiscussion(node, config.GITHUB_OWNER))
    .filter((post) => post.published)
    .filter(
      (post) => !options.category || post.category.slug === options.category,
    );

  return { posts, pageInfo: data.repository.discussions.pageInfo };
}

export async function getAllPosts(
  options: { category?: string } = {},
): Promise<Post[]> {
  const posts: Post[] = [];
  const seenCursors = new Set<string>();
  let after: string | undefined;

  while (true) {
    const page = await getPosts({
      first: MAX_PAGE_SIZE,
      after,
      category: options.category,
    });
    posts.push(...page.posts);

    if (!page.pageInfo.hasNextPage) return posts;

    const cursor = page.pageInfo.endCursor;
    if (!cursor || seenCursors.has(cursor)) {
      throw new Error("GitHub post pagination returned an invalid cursor.");
    }

    seenCursors.add(cursor);
    after = cursor;
  }
}

export async function getPost(number: number): Promise<Post | null> {
  if (!Number.isInteger(number) || number < 1) return null;

  const config = getConfig();
  if (!config) return null;

  const data = await request<DiscussionDetailData>(
    config,
    DETAIL_QUERY,
    {
      owner: config.GITHUB_OWNER,
      repo: config.GITHUB_REPO,
      number,
    },
    ["posts", `post:${number}`],
  );

  if (!data.repository.discussion) return null;
  return mapDiscussion(data.repository.discussion, config.GITHUB_OWNER);
}
