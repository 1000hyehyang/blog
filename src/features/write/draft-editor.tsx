"use client";
import { useState } from "react";
import Link from "next/link";
import { useHydrated } from "@/lib/react/use-hydrated";
import { PostEditor } from "./post-editor";
import { readDraft } from "./local-drafts";
import { WriteSkeleton } from "./writer-skeleton";
import styles from "./writer.module.css";

export function DraftEditor(props: { id: string; writable: boolean }) {
  const hydrated = useHydrated();
  return hydrated ? (
    <LoadedDraftEditor key={props.id} {...props} />
  ) : (
    <WriteSkeleton />
  );
}
function LoadedDraftEditor({
  id,
  writable,
}: {
  id: string;
  writable: boolean;
}) {
  const [draft] = useState(() => {
    try {
      return readDraft(id);
    } catch {
      return null;
    }
  });
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
    <PostEditor
      initial={draft.post}
      initialSha={draft.sha}
      writable={writable}
      pinned={draft.pinned}
      draft={draft}
    />
  );
}
