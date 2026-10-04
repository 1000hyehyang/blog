import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { FilePostSummary } from "@/lib/content/post-file";
import { routes } from "@/lib/routes";

type DiscussionCounts = {
  title: string;
  category: { id: string };
  comments: { totalCount: number };
  reactions: { totalCount: number };
};
type Counts = Pick<FilePostSummary, "commentsCount" | "reactionsCount">;

async function fetchCounts(owner: string, name: string, category: string) {
  "use cache";
  cacheLife({ stale: 30, revalidate: 300, expire: 3600 });
  cacheTag("comment-counts");
  const counts: Record<string, Counts | null> = {};
  const cursors = new Set<string>();
  const signal = AbortSignal.timeout(5000);
  let after: string | null = null;
  try {
    do {
      const response: Response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `query($owner:String!,$name:String!,$after:String) {
            repository(owner:$owner,name:$name) { discussions(first:100,after:$after) {
              pageInfo { hasNextPage endCursor }
              nodes { title category { id } comments { totalCount } reactions { totalCount } }
            } }
          }`,
          variables: { owner, name, after },
        }),
        cache: "no-store",
        signal,
      });
      const payload: {
        errors?: unknown;
        data?: {
          repository: {
            discussions: {
              nodes: DiscussionCounts[];
              pageInfo: { hasNextPage: boolean; endCursor: string | null };
            };
          };
        };
      } = await response.json();
      if (!response.ok || payload.errors || !payload.data?.repository)
        return {};
      const page = payload.data.repository.discussions;
      for (const discussion of page.nodes) {
        if (category && discussion.category.id !== category) continue;
        counts[discussion.title] =
          discussion.title in counts
            ? null
            : {
                commentsCount: discussion.comments.totalCount,
                reactionsCount: discussion.reactions.totalCount,
              };
      }
      after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
      if (page.pageInfo.hasNextPage && (!after || cursors.has(after)))
        return {};
      if (after) cursors.add(after);
      // 조회를 100페이지로 제한하고 초과하면 저장된 댓글 수를 사용한다.
      if (after && cursors.size >= 100) return {};
    } while (after);
    return counts;
  } catch {
    return {};
  }
}

export async function withCommentCounts<T extends FilePostSummary>(
  posts: T[],
): Promise<T[]> {
  const [owner, name] = (process.env.NEXT_PUBLIC_GISCUS_REPO ?? "").split("/");
  if (!owner || !name || !process.env.GITHUB_TOKEN || !posts.length)
    return posts;
  const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID ?? "";
  const counts = await fetchCounts(owner, name, category);
  return posts.map((post) => {
    const value = counts[routes.post(post.id)];
    return value ? { ...post, ...value } : post;
  });
}
