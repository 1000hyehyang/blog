import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isWriter } from "@/lib/writer-auth";
import {
  getStoredPost,
  getStoredPosts,
  usesGitHubStorage,
} from "@/infrastructure/github/posts";
import { PostEditor } from "@/features/write/post-editor";
import { pinnedPosts } from "@/features/write/pinned-posts";
import { DraftEditor } from "@/features/write/draft-editor";
import { slugSchema } from "@/lib/content/post-file";

export const metadata: Metadata = {
  title: "글쓰기",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

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
    return (
      <DraftEditor key={draft} id={draft} writable={usesGitHubStorage()} />
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
