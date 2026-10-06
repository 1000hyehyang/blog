import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isWriter } from "@/lib/writer-auth";
import {
  getStoredPost,
  getStoredPosts,
  usesGitHubStorage,
} from "@/infrastructure/github/post-store";
import { PostEditor } from "@/features/write/post-editor";
import { pinnedPosts } from "@/domain/pinned-posts";
import { DraftEditor } from "@/features/write/draft-editor";
import { slugSchema } from "@/lib/content/post-file";

export const metadata: Metadata = {
  title: "글쓰기",
  robots: { index: false, follow: false },
};

export default async function WritePage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; draft?: string }>;
}) {
  const { slug, draft } = await searchParams;
  if (!(await isWriter())) {
    const next = draft
      ? `/write?draft=${encodeURIComponent(draft)}`
      : slug
        ? `/write?slug=${encodeURIComponent(slug)}`
        : "/write";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  if (draft) {
    if (!slugSchema.safeParse(draft).success) notFound();
    let pinned = null;
    try {
      pinned = pinnedPosts(await getStoredPosts());
    } catch (error) {
      console.warn(
        "[writer] Failed to load current pinned posts for a local draft.",
        error,
      );
    }
    return (
      <DraftEditor
        key={draft}
        id={draft}
        writable={usesGitHubStorage()}
        pinned={pinned}
      />
    );
  }
  const stored = slug ? await getStoredPost(slug) : null;
  if (slug && !stored) notFound();
  const posts = await getStoredPosts();
  return (
    <PostEditor
      key={slug ?? "new"}
      initial={stored?.post ?? null}
      initialSha={stored?.sha ?? null}
      writable={usesGitHubStorage()}
      pinned={pinnedPosts(posts)}
      postSlugs={posts.map((post) => post.slug)}
    />
  );
}
