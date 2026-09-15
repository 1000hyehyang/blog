"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { readDrafts, removeDraft, type LocalDraft } from "./local-drafts";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import type { FilePost } from "@/lib/content/post-file";
import { siteConfig } from "@/config/site";
import { WriterSelect } from "./writer-controls";
import styles from "./writer.module.css";

export type ManagedPost = Pick<
  FilePost,
  "slug" | "title" | "category" | "published" | "createdAt" | "lastEditedAt"
> & { localVersion?: string; sha?: string };
export const MANAGE_PAGE_SIZE = 6;
export function ManagePosts({
  posts,
  initialTab = "published",
}: {
  posts: ManagedPost[];
  initialTab?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState(
    initialTab === "drafts" ? "drafts" : "published",
  );
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("latest");
  const [page, setPage] = useState(1);
  const [drafts, setDrafts] = useState<LocalDraft[]>([]);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState("");
  const [removed, setRemoved] = useState<string[]>([]);
  useEffect(() => {
    function refresh() {
      try {
        setDrafts(readDrafts());
        setError("");
      } catch {
        setError("일부 임시 저장 글을 불러오지 못했습니다.");
      }
    }
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("writer-drafts", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("writer-drafts", refresh);
    };
  }, []);
  async function removePublished(post: ManagedPost) {
    if (!post.sha || post.sha === "local" || !confirm("이 글을 삭제할까요?"))
      return;
    setDeleting(post.slug);
    setError("");
    try {
      const response = await fetch(
        `/api/write/posts/${encodeURIComponent(post.slug)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sha: post.sha }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message ?? "글을 삭제하지 못했습니다.");
      setRemoved((slugs) => [...slugs, post.slug]);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "글을 삭제하지 못했습니다.",
      );
    } finally {
      setDeleting("");
    }
  }
  const all: ManagedPost[] = [
    ...posts.filter((post) => !removed.includes(post.slug)),
    ...drafts.map((draft) => ({
      ...draft.post,
      published: false,
      createdAt: draft.savedAt,
      localVersion: draft.savedAt,
    })),
  ];
  const filtered = all
    .filter(
      (post) =>
        post.published === (tab === "published") &&
        (category === "all" || post.category.slug === category),
    )
    .sort((a, b) => {
      const diff = Date.parse(a.createdAt) - Date.parse(b.createdAt);
      return (sort === "oldest" ? diff : -diff) || a.slug.localeCompare(b.slug);
    });
  const pages = Math.max(1, Math.ceil(filtered.length / MANAGE_PAGE_SIZE));
  const current = Math.min(page, pages);
  return (
    <section className={styles.management}>
      <div className={styles.managementHeading}>
        <h1>
          글 관리 <span>{filtered.length}</span>
        </h1>
        <Link className={styles.primary} href="/write">
          <Plus size={17} aria-hidden="true" />
          글쓰기
        </Link>
      </div>
      <div className={styles.managementFilters}>
        <div className={styles.managementTabs} aria-label="글 상태">
          <button
            type="button"
            aria-pressed={tab === "published"}
            onClick={() => {
              setTab("published");
              setPage(1);
            }}
          >
            발행됨
          </button>
          <button
            type="button"
            aria-pressed={tab === "drafts"}
            onClick={() => {
              setTab("drafts");
              setPage(1);
            }}
          >
            임시 저장
          </button>
        </div>
        <WriterSelect
          label="카테고리 필터"
          value={category}
          options={[
            { value: "all", label: "전체 카테고리" },
            ...siteConfig.navigation.map((item) => ({
              value: item.category,
              label: item.label,
            })),
          ]}
          onChange={(value) => {
            setCategory(value);
            setPage(1);
          }}
        />
        <WriterSelect
          label="정렬"
          value={sort}
          options={[
            { value: "latest", label: "최신순" },
            { value: "oldest", label: "오래된순" },
          ]}
          onChange={(value) => {
            setSort(value);
            setPage(1);
          }}
        />
      </div>
      {error && <p role="alert">{error}</p>}
      <ul className={styles.postList}>
        {filtered
          .slice((current - 1) * MANAGE_PAGE_SIZE, current * MANAGE_PAGE_SIZE)
          .map((post) => (
            <li key={`${post.localVersion ? "local:" : ""}${post.slug}`}>
              <div className={styles.postSummary}>
                <div className={styles.postMeta}>
                  <span>{post.published ? "발행됨" : "임시 저장"}</span>
                  {post.category.name}
                  <span>·</span>
                  <time dateTime={post.createdAt}>
                    {post.createdAt.slice(0, 10)}
                  </time>
                </div>
                <Link
                  href={`/write?${post.localVersion ? "draft" : "slug"}=${encodeURIComponent(post.slug)}`}
                  className={styles.postTitle}
                >
                  {post.title}
                </Link>
              </div>
              <div className={styles.postActions}>
                <Link
                  href={`/write?${post.localVersion ? "draft" : "slug"}=${encodeURIComponent(post.slug)}`}
                  className={styles.editAction}
                  aria-label={`${post.title} ${post.published ? "수정" : "이어쓰기"}`}
                  title={post.published ? "수정" : "이어쓰기"}
                >
                  <Pencil size={17} aria-hidden="true" />
                </Link>
                {post.localVersion ? (
                  <button
                    type="button"
                    aria-label={`${post.title} 임시 저장 삭제`}
                    title="삭제"
                    className={styles.editAction}
                    onClick={() => {
                      if (!confirm("임시 저장한 글을 삭제할까요?")) return;
                      try {
                        removeDraft(post.slug, post.localVersion!);
                      } catch {
                        setError(
                          "임시 저장본이 변경되었습니다. 다시 확인해 주세요.",
                        );
                      }
                    }}
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label={`${post.title} 삭제`}
                    title="삭제"
                    className={styles.editAction}
                    disabled={post.sha === "local" || deleting === post.slug}
                    onClick={() => void removePublished(post)}
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          ))}
      </ul>
      {!filtered.length && (
        <p className={styles.emptyState}>
          {tab === "drafts"
            ? "임시 저장한 글이 없습니다."
            : "게시글이 없습니다."}
        </p>
      )}
      <nav className={styles.pagination} aria-label="글 목록 페이지">
        <button
          type="button"
          aria-label="이전 페이지"
          disabled={current === 1}
          onClick={() => setPage(current - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        <span>
          {current} / {pages}
        </span>
        <button
          type="button"
          aria-label="다음 페이지"
          disabled={current === pages}
          onClick={() => setPage(current + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </nav>
    </section>
  );
}
