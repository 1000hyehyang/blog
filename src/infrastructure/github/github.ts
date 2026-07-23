import "server-only";

import { z } from "zod";

import type { Post, PostPage } from "@/domain/post";
import { parsePostBody, toSlug } from "@/lib/content";

const GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql";
// Discussion 변경은 /api/revalidate 웹훅이 즉시 무효화하므로 주기는 안전망이다.
const REVALIDATE_SECONDS = 3600;
const MAX_PAGE_SIZE = 50;

const envSchema = z.object({
  GITHUB_TOKEN: z.string().min(1),
  GITHUB_OWNER: z.string().min(1),
  GITHUB_REPO: z.string().min(1),
});

type GitHubConfig = z.infer<typeof envSchema>;

type Actor = { login: string; avatarUrl: string; url: string };
type ReactionGroup = { users: { totalCount: number } };
type DiscussionNode = {
  id: string;
  number: number;
  title: string;
  body: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string };
  author: Actor | null;
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
  id number title body url createdAt updatedAt
  category { id name }
  author { login avatarUrl url }
  comments { totalCount }
  reactionGroups { users { totalCount } }
`;

const LIST_QUERY = `
  query Posts($owner: String!, $repo: String!, $first: Int!, $after: String) {
    repository(owner: $owner, name: $repo) {
      discussions(first: $first, after: $after, orderBy: {field: CREATED_AT, direction: DESC}) {
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

const FALLBACK_AUTHOR: Actor = {
  login: "unknown",
  avatarUrl: "",
  url: "https://github.com",
};

function mapDiscussion(node: DiscussionNode): Post {
  const { body, metadata } = parsePostBody(node.body);
  return {
    id: node.id,
    number: node.number,
    slug: metadata.slug ?? toSlug(node.title),
    title: node.title,
    body,
    excerpt: metadata.excerpt,
    coverImage: metadata.coverImage,
    featured: metadata.featured,
    featuredOrder: metadata.featuredOrder,
    published: metadata.published,
    tags: metadata.tags,
    category: {
      id: node.category.id,
      name: node.category.name,
      slug: toSlug(node.category.name),
    },
    author: node.author ?? FALLBACK_AUTHOR,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    commentsCount: node.comments.totalCount,
    reactionsCount: countReactions(node.reactionGroups),
    url: node.url,
  };
}

export async function getPosts(
  options: {
    first?: number;
    after?: string;
    category?: string;
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
  });

  const posts = data.repository.discussions.nodes
    .map(mapDiscussion)
    .filter((post) => post.published)
    .filter(
      (post) => !options.category || post.category.slug === options.category,
    );

  return { posts, pageInfo: data.repository.discussions.pageInfo };
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
  return mapDiscussion(data.repository.discussion);
}
