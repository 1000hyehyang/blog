"use client";

import { WriterHeader } from "@/features/write/writer-header";
import styles from "@/features/write/writer.module.css";

export default function ManageError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className={styles.writer}>
      <WriterHeader />
      <section className={styles.management}>
        <div className={styles.emptyState}>
          <h1>글 목록을 불러오지 못했습니다.</h1>
          <button type="button" onClick={reset}>
            다시 시도
          </button>
        </div>
      </section>
    </div>
  );
}
