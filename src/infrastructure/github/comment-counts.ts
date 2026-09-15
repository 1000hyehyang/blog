import "server-only";
import type { FilePost } from "@/lib/content/post-file";
import { routes } from "@/lib/routes";

type DiscussionCounts = {
  title: string;
  category: { id: string };
  comments: { totalCount: number };
  reactions: { totalCount: number };
};

// Comments remain in Giscus; never use Discussion bodies as post content.
export async function withCommentCounts(
  posts: FilePost[],
): Promise<FilePost[]> {
  const [owner, name] = (process.env.NEXT_PUBLIC_GISCUS_REPO ?? "").split("/");
  const token = process.env.GITHUB_TOKEN;
  if (!owner || !name || !token || !posts.length) return posts;
  try {
    const discussions: DiscussionCounts[] = [];
    const cursors = new Set<string>();
    let after: string | null = null;
    do {
      const response: Response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
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
        signal: AbortSignal.timeout(5000),
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
        return posts;
      const page = payload.data.repository.discussions;
      discussions.push(...page.nodes);
      after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
      if (page.pageInfo.hasNextPage && (!after || cursors.has(after)))
        return posts;
      if (after) cursors.add(after);
      // ponytail: small comment repository; retain saved counts beyond 1,000 discussions, add a dedicated index then.
      if (after && discussions.length >= 1000) return posts;
    } while (after);
    return posts.map((post) => {
      const matches = discussions.filter(
        (discussion) =>
          discussion.title === routes.post(post.slug) &&
          (!process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID ||
            discussion.category.id ===
              process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID),
      );
      if (matches.length !== 1) return post;
      return {
        ...post,
        commentsCount: matches[0].comments.totalCount,
        reactionsCount: matches[0].reactions.totalCount,
      };
    });
  } catch {
    // A comment-service outage must not take down the articles.
    return posts;
  }
}
