"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useHydrated } from "@/lib/react/use-hydrated";
import { PostEditor } from "./post-editor";
import { readDraft, type LocalDraft } from "./local-drafts";
import { WriteSkeleton } from "./writer-skeleton";
import styles from "./writer.module.css";
import type { PinnedPost } from "@/domain/pinned-posts";

type Props = { id: string; writable: boolean; pinned: PinnedPost[] | null };
export function DraftEditor(props: Props) {
  const hydrated = useHydrated();
  return hydrated ? (
    <LoadedDraftEditor key={props.id} {...props} />
  ) : (
    <WriteSkeleton />
  );
}
function LoadedDraftEditor({ id, writable, pinned }: Props) {
  const [draft, setDraft] = useState<LocalDraft | null>();
  useEffect(() => {
    let active = true;
    readDraft(id).then(
      (value) => {
        if (active) setDraft(value);
      },
      () => {
        if (active) setDraft(null);
      },
    );
    return () => {
      active = false;
    };
  }, [id]);
  if (draft === undefined) return <WriteSkeleton />;
  if (!draft)
    return (
      <div className={styles.writer}>
        <section className={styles.management}>
          <p role="alert">
            임시 저장한 글을 불러오지 못했습니다. 목록에서 다시 선택해 주세요.
          </p>
          <Link href="/manage?tab=drafts">임시 저장 목록</Link>
        </section>
      </div>
    );
  return (
    <>
      {pinned === null && (
        <p role="alert">
          최신 고정 목록을 불러오지 못했습니다. 본문 편집과 임시 저장은
          가능합니다. 발행하려면 연결 복구 후 다시 열어 주세요.
        </p>
      )}
      <PostEditor
        initial={draft.post}
        initialSha={draft.sha}
        writable={writable && pinned !== null}
        pinned={pinned ?? draft.pinned}
        draft={draft}
      />
    </>
  );
}
