import "server-only";

import { z } from "zod";

import type { Comment, Post, PostPage } from "@/domain/post";
import { parsePostBody, toSlug } from "@/lib/content";

const envSchema = z.object({
  GITHUB_TOKEN: z.string().min(1),
  GITHUB_OWNER: z.string().min(1),
  GITHUB_REPO: z.string().min(1),
});

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
  comments: { totalCount: number; nodes?: CommentNode[] };
  reactionGroups: ReactionGroup[];
};
type CommentNode = {
  id: string;
  body: string;
  createdAt: string;
  url: string;
  author: Actor | null;
  reactionGroups: ReactionGroup[];
};

const LIST_QUERY = `
  query Posts($owner: String!, $repo: String!, $first: Int!, $after: String) {
    repository(owner: $owner, name: $repo) {
      discussions(first: $first, after: $after, orderBy: {field: UPDATED_AT, direction: DESC}) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id number title body url createdAt updatedAt
          category { id name }
          author { login avatarUrl url }
          comments { totalCount }
          reactionGroups { users { totalCount } }
        }
      }
    }
  }
`;

const DETAIL_QUERY = `
  query Post($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      discussion(number: $number) {
        id number title body url createdAt updatedAt
        category { id name }
        author { login avatarUrl url }
        reactionGroups { users { totalCount } }
        comments(first: 100) {
          totalCount
          nodes {
            id body createdAt url
            author { login avatarUrl url }
            reactionGroups { users { totalCount } }
          }
        }
      }
    }
  }
`;

function getConfig() {
  return envSchema.safeParse(process.env);
}

export function isGitHubConfigured() {
  return getConfig().success;
}

async function request<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const config = getConfig();
  if (!config.success)
    throw new Error("GitHub Discussions 환경 변수가 설정되지 않았습니다.");

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.data.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 300, tags: ["posts"] },
  });

  if (!response.ok) throw new Error("콘텐츠 제공자에 연결할 수 없습니다.");
  const payload = (await response.json()) as { data?: T; errors?: unknown[] };
  if (!payload.data || payload.errors?.length) {
    throw new Error("콘텐츠를 불러오지 못했습니다.");
  }
  return payload.data;
}

function reactions(groups: ReactionGroup[] = []) {
  return groups.reduce((total, group) => total + group.users.totalCount, 0);
}

function fallbackAuthor(): Actor {
  return { login: "unknown", avatarUrl: "", url: "https://github.com" };
}

export function mapDiscussion(node: DiscussionNode): Post {
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
    author: node.author ?? fallbackAuthor(),
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    commentsCount: node.comments.totalCount,
    reactionsCount: reactions(node.reactionGroups),
    url: node.url,
  };
}

function mapComment(node: CommentNode): Comment {
  return {
    id: node.id,
    body: node.body,
    author: node.author ?? fallbackAuthor(),
    createdAt: node.createdAt,
    reactionsCount: reactions(node.reactionGroups),
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
  if (!isGitHubConfigured()) {
    return { posts: [], pageInfo: { hasNextPage: false, endCursor: null } };
  }
  const config = getConfig();
  if (!config.success) throw new Error("GitHub 설정 오류");
  const data = await request<{
    repository: {
      discussions: {
        nodes: DiscussionNode[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    };
  }>(LIST_QUERY, {
    owner: config.data.GITHUB_OWNER,
    repo: config.data.GITHUB_REPO,
    first: Math.min(options.first ?? 12, 50),
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

export async function getPost(number: number) {
  if (!Number.isInteger(number) || number < 1 || !isGitHubConfigured())
    return null;
  const config = getConfig();
  if (!config.success) return null;
  const data = await request<{
    repository: { discussion: DiscussionNode | null };
  }>(DETAIL_QUERY, {
    owner: config.data.GITHUB_OWNER,
    repo: config.data.GITHUB_REPO,
    number,
  });
  if (!data.repository.discussion) return null;
  const post = mapDiscussion(data.repository.discussion);
  return {
    post,
    comments: (data.repository.discussion.comments.nodes ?? []).map(mapComment),
  };
}
