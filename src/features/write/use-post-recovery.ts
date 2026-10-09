import { useEffect, useEffectEvent, useRef } from "react";
import type { Editor } from "@tiptap/react";
import type { PostFields } from "@/domain/post";
import {
  saveRecovery,
  removeRecovery,
  trackRecoveryWrite,
  type LocalDraft,
} from "./local-drafts";

export function usePostRecovery({
  key,
  recovery,
  editor,
  dirty,
  fields,
  tags,
  order,
  readDraft,
  onError,
}: {
  key: string;
  recovery: LocalDraft | null;
  editor: Editor | null;
  dirty: boolean;
  fields: PostFields;
  tags: string;
  order: string[];
  readDraft: () => Promise<LocalDraft | null>;
  onError: (message: string) => void;
}) {
  const version = useRef(recovery?.savedAt ?? null);
  const pending = useRef(Promise.resolve(true));
  const cleared = useRef(false);
  const changed = useRef(false);
  const previous = useRef({ fields, tags, order });
  function checkpoint() {
    if (!dirty || !changed.current || cleared.current) return;
    changed.current = false;
    // 편집기가 이탈 후 다시 초기화되기 전에 현재 내용을 읽는다.
    const snapshot = readDraft().catch(() => null);
    pending.current = pending.current
      .then(async () => {
        if (cleared.current) return true;
        const value = await snapshot;
        if (cleared.current) return true;
        if (!value) throw new Error("Recovery snapshot unavailable");
        value.savedAt = new Date(
          Math.max(Date.now(), Date.parse(version.current ?? "") + 1 || 0),
        ).toISOString();
        await saveRecovery(key, value, version.current);
        version.current = value.savedAt;
        return true;
      })
      .catch(() => {
        changed.current = true;
        onError("자동 저장에 실패했어요. 이동 전 내용을 복사해 주세요.");
        return false;
      });
    trackRecoveryWrite(key, pending.current);
  }
  const checkpointOnEvent = useEffectEvent(() => checkpoint());
  const markChanged = useEffectEvent(() => {
    changed.current = true;
    cleared.current = false;
  });
  useEffect(() => {
    if (
      dirty &&
      (previous.current.fields !== fields ||
        previous.current.tags !== tags ||
        previous.current.order !== order)
    ) {
      markChanged();
    }
    previous.current = { fields, tags, order };
  }, [dirty, fields, tags, order]);
  useEffect(() => {
    const save = () => checkpointOnEvent();
    const interval = setInterval(save, 60_000);
    const update = ({
      transaction,
    }: {
      transaction: { docChanged: boolean };
    }) => {
      if (transaction.docChanged) markChanged();
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") save();
    };
    editor?.on("update", update);
    window.addEventListener("popstate", save);
    window.addEventListener("beforeunload", save);
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(interval);
      save();
      editor?.off("update", update);
      window.removeEventListener("popstate", save);
      window.removeEventListener("beforeunload", save);
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [editor, key]);

  async function flush() {
    checkpoint();
    return pending.current;
  }

  async function clear() {
    cleared.current = true;
    changed.current = false;
    await pending.current;
    if (version.current) {
      try {
        await removeRecovery(key, version.current);
        version.current = null;
      } catch {
        onError("글은 저장됐어요. 다시 열 때 저장한 내용인지 확인해 주세요.");
      }
    }
  }
  return { clear, flush };
}
