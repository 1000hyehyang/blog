import { useState } from "react";
import { removeDamagedDraft, type DamagedDraft } from "./local-drafts";
import styles from "./writer.module.css";

export function DamagedDrafts({ drafts }: { drafts: DamagedDraft[] }) {
  const [error, setError] = useState("");
  if (!drafts.length) return null;
  return (
    <section className={styles.notice} aria-label="복구가 필요한 임시 저장본">
      <p role="alert">
        임시 저장본 {drafts.length}개를 읽지 못했습니다. 원문은 보존되어 있으며
        내려받을 수 있습니다.
      </p>
      {error && <p role="alert">{error}</p>}
      <ul>
        {drafts.map((draft, index) => (
          <li key={draft.key}>
            <span>{draft.key}</span>{" "}
            <a
              href={`data:application/json;charset=utf-8,${encodeURIComponent(draft.raw)}`}
              download={`draft-recovery-${index + 1}.json`}
            >
              원문 내려받기
            </a>{" "}
            <button
              type="button"
              onClick={async () => {
                if (
                  !window.confirm(
                    "복구가 필요한 임시 저장본을 삭제할까요? 필요한 원문을 먼저 내려받아 주세요.",
                  )
                )
                  return;
                try {
                  await removeDamagedDraft(draft);
                  setError("");
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "삭제하지 못했습니다.",
                  );
                }
              }}
            >
              손상된 저장본 삭제
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
