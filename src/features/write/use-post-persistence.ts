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
import type { ButtonState } from "./stateful-button";

type Action = "publish" | "draft" | "delete";
type Options = {
  initial: StoredPost | null;
  initialSha: string | null;
  draft?: LocalDraft;
  postSlugs: string[];
  currentPin: string;
  pins: ReturnType<typeof usePinnedOrder>;
  readFields: () => PostFields | null;
  onSaved: (post?: StoredPost) => void;
};

export function usePostPersistence({
  initial,
  initialSha,
  draft,
  postSlugs,
  currentPin,
  pins,
  readFields,
  onSaved,
}: Options) {
  const router = useRouter();
  const generatedSlug = useRef(initial?.slug ?? "");
  const postId = useRef(initial?.id ?? "");
  const [sha, setSha] = useState(initialSha);
  const [draftVersion, setDraftVersion] = useState(draft?.savedAt ?? null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<{
    action: Action;
    state: ButtonState;
  } | null>(null);
  const pinnedOrder = pins.order;

  function start(action?: Action) {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setMessage("");
    setFeedback(action ? { action, state: "loading" } : null);
    return true;
  }
  function finish() {
    busyRef.current = false;
    setBusy(false);
  }
  async function showSuccess(action: Action) {
    setFeedback({ action, state: "success" });
    await new Promise((resolve) => setTimeout(resolve, 450));
  }
  function buttonState(action: Action): ButtonState {
    return feedback?.action === action ? feedback.state : "idle";
  }
  function allocateId() {
    return (postId.current ||= crypto.randomUUID());
  }
  function allocateSlug() {
    if (generatedSlug.current) return generatedSlug.current;
    try {
      generatedSlug.current = nextPostSlug([
        ...postSlugs,
        ...reservedDraftSlugs(),
      ]);
      return generatedSlug.current;
    } catch {
      throw new Error("임시 저장 글 번호를 확인하지 못했습니다.");
    }
  }

  async function save(published: boolean) {
    if (pins.conflict || !start("publish")) return;
    try {
      const fields = readFields();
      if (!fields) return;
      const slug = allocateSlug();
      const order = pinnedOrder
        .filter(
          (value) => value !== currentPin || (fields.featured && published),
        )
        .map((value) => (value === currentPin ? slug : value));
      const response = await fetch(
        `/api/write/posts/${encodeURIComponent(slug)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            post: { ...fields, id: allocateId(), published },
            sha,
            pinned: { base: pins.base, order },
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        const conflict = pinnedConflictSchema.safeParse(data.conflict);
        if (response.status === 409 && conflict.success)
          pins.setConflict(conflict.data.posts);
        throw new Error(data.message);
      }
      setSha(data.sha);
      if (draftVersion) {
        try {
          removeDraft(slug, draftVersion);
          setDraftVersion(null);
        } catch {
          setMessage(
            "발행했습니다. 남아 있는 임시 저장본은 글 관리에서 확인해 주세요.",
          );
        }
      }
      await showSuccess("publish");
      onSaved(data.post);
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
      const slug = allocateSlug();
      const now = new Date().toISOString();
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
      saveDraft(value, draftVersion);
      setDraftVersion(now);
      await showSuccess("draft");
      onSaved();
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
      const response = await fetch(
        `/api/write/posts/${encodeURIComponent(initial.slug)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sha }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      await showSuccess("delete");
      onSaved();
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
  return {
    sha,
    busy,
    message,
    setMessage,
    setFeedback,
    start,
    finish,
    buttonState,
    allocateId,
    save,
    storeDraft,
    remove,
  };
}
