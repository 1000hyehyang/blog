import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isWriter } from "@/lib/writer-auth";
import { getStoredPostsWithSha } from "@/infrastructure/github/posts";
import { WriterHeader } from "@/features/write/writer-header";
import { ManagePosts } from "@/features/write/manage-posts";
import styles from "@/features/write/writer.module.css";

export const metadata: Metadata = {
  title: "글 관리",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function ManagePage({
  searchParams,
}: { searchParams?: Promise<{ tab?: string }> } = {}) {
  const query = await searchParams;
  if (!(await isWriter()))
    redirect(
      query?.tab === "drafts"
        ? "/login?next=%2Fmanage%3Ftab%3Ddrafts"
        : "/login?next=%2Fmanage",
    );
  const posts = await getStoredPostsWithSha();
  return (
    <div className={styles.writer}>
      <WriterHeader />
      <ManagePosts
        initialTab={query?.tab}
        posts={posts.map(
          ({
            post: { slug, title, category, published, createdAt, lastEditedAt },
            sha,
          }) => ({
            slug,
            title,
            category,
            published,
            createdAt,
            lastEditedAt,
            sha,
          }),
        )}
      />
    </div>
  );
}
