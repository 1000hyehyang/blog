import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PostFields, StoredPost } from "@/domain/post";
import { pinnedConflictSchema } from "@/domain/pinned-posts";
import { nextPostSlug } from "@/lib/content/post-file";
import {
  reservedDraftSlugs,
  saveDraft,
  removeDraft,
  type LocalDraft,
} from "./local-drafts";
import type { usePinnedOrder } from "./use-pinned-order";
import type { useWriterFeedback } from "./use-writer-feedback";
import {
  savePostRequest,
  deletePostRequest,
  postConflictSchema,
} from "./post-api";

type Options = {
  feedback: ReturnType<typeof useWriterFeedback>;
  initial: StoredPost | null;
  initialSha: string | null;
  draft?: LocalDraft;
  recovery?: LocalDraft | null;
  postSlugs: string[];
  currentPin: string;
  pins: ReturnType<typeof usePinnedOrder>;
  readFields: () => PostFields | null;
  onSaved: (post?: StoredPost) => void | Promise<void>;
};

export function usePostPersistence({
  feedback,
  initial,
  initialSha,
  draft,
  recovery,
  postSlugs,
  currentPin,
  pins,
  readFields,
  onSaved,
}: Options) {
  const router = useRouter();
  const generatedSlug = useRef(recovery?.post.slug ?? initial?.slug ?? "");
  const postId = useRef(recovery?.post.id ?? initial?.id ?? "");
  const [sha, setSha] = useState(recovery ? recovery.sha : initialSha);
  const [draftVersion, setDraftVersion] = useState(draft?.savedAt ?? null);
  const { start, finish, setMessage, setFeedback, showSuccess } = feedback;
  const pinnedOrder = pins.order;

  function allocateId() {
    return (postId.current ||= crypto.randomUUID());
  }
  async function allocateSlug() {
    if (generatedSlug.current) return generatedSlug.current;
    try {
      generatedSlug.current = nextPostSlug([
        ...postSlugs,
        ...(await reservedDraftSlugs()),
      ]);
      return generatedSlug.current;
    } catch {
      throw new Error("임시 저장 글 번호를 확인하지 못했습니다.");
    }
  }

  async function save() {
    if (pins.conflict || !start("publish")) return;
    try {
      const fields = readFields();
      if (!fields) return;
      const slug = await allocateSlug();
      const order = pinnedOrder
        .filter((value) => value !== currentPin || fields.featured)
        .map((value) => (value === currentPin ? slug : value));
      const data = await savePostRequest(
        slug,
        { ...fields, id: allocateId(), published: true },
        sha,
        { base: pins.base, order },
      );
      if (!data.ok) {
        const conflict = pinnedConflictSchema.safeParse(data.conflict);
        if (data.status === 409 && conflict.success)
          pins.setConflict(conflict.data.posts);
        const postConflict = postConflictSchema.safeParse(data.conflict);
        if (
          data.status === 409 &&
          postConflict.success &&
          (postConflict.data.id === postId.current ||
            postConflict.data.id === null) &&
          window.confirm(
            "서버의 글이 변경되었습니다. 현재 작성 내용으로 서버 저장본을 덮어쓸까요? 취소하면 작성 내용과 서버 저장본을 모두 유지합니다.",
          )
        ) {
          setSha(postConflict.data.sha);
          throw new Error(
            "현재 작성 내용은 유지됩니다. 확인한 서버 버전으로 저장하려면 다시 발행해 주세요.",
          );
        }
        throw new Error(data.message);
      }
      setSha(data.sha);
      if (draftVersion) {
        try {
          await removeDraft(slug, draftVersion);
          setDraftVersion(null);
        } catch {
          setMessage(
            "발행했습니다. 남아 있는 임시 저장본은 글 관리에서 확인해 주세요.",
          );
        }
      }
      await showSuccess("publish");
      await onSaved(data.post);
      router.replace("/manage");
      router.refresh();
    } catch (error) {
      setFeedback({ action: "publish", state: "error" });
      setMessage(
        error instanceof Error
          ? error.message
          : "저장에 실패했습니다. 작성 내용은 유지됩니다. 다시 시도해 주세요.",
      );
    } finally {
      finish();
    }
  }
  async function storeDraft() {
    if (!start("draft")) return;
    try {
      const fields = readFields();
      if (!fields) return;
      const slug = await allocateSlug();
      const now = new Date(
        Math.max(Date.now(), Date.parse(draftVersion ?? "") + 1 || 0),
      ).toISOString();
      const value: LocalDraft = {
        post: {
          createdAt: initial?.createdAt ?? now,
          lastEditedAt: initial?.lastEditedAt ?? null,
          commentsCount: 0,
          reactionsCount: 0,
          ...initial,
          ...fields,
          id: allocateId(),
          title: fields.title.trim() || "제목 없음",
          slug,
        },
        sha,
        savedAt: now,
        pinned: pins.posts,
        order: pinnedOrder.map((value) =>
          value === currentPin ? slug : value,
        ),
      };
      await saveDraft(value, draftVersion);
      setDraftVersion(now);
      await showSuccess("draft");
      await onSaved();
      router.replace(`/write?draft=${encodeURIComponent(slug)}`);
    } catch (error) {
      setFeedback({ action: "draft", state: "error" });
      setMessage(
        error instanceof Error
          ? error.message
          : "임시 저장하지 못했습니다. 현재 내용은 유지됩니다.",
      );
    } finally {
      finish();
    }
  }
  async function remove() {
    if (
      !initial ||
      !sha ||
      !window.confirm("이 글을 삭제할까요?") ||
      !start("delete")
    )
      return;
    try {
      await deletePostRequest(initial.slug, sha);
      await showSuccess("delete");
      await onSaved();
      router.replace("/manage");
      router.refresh();
    } catch (error) {
      setFeedback({ action: "delete", state: "error" });
      setMessage(
        error instanceof Error ? error.message : "삭제에 실패했습니다.",
      );
    } finally {
      finish();
    }
  }
  async function recoveryDraft(): Promise<LocalDraft | null> {
    const fields = readFields();
    if (!fields) return null;
    const now = new Date().toISOString();
    const slug = await allocateSlug();
    return {
      post: {
        createdAt: initial?.createdAt ?? now,
        lastEditedAt: initial?.lastEditedAt ?? null,
        commentsCount: 0,
        reactionsCount: 0,
        ...initial,
        ...fields,
        id: allocateId(),
        slug,
      },
      sha,
      savedAt: now,
      baseDraftSavedAt: draftVersion,
      pinned: pins.posts,
      order: pinnedOrder.map((value) => (value === currentPin ? slug : value)),
    };
  }
  return { sha, allocateId, save, storeDraft, remove, recoveryDraft };
}
