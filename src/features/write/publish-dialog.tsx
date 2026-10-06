"use client";

import { motion } from "framer-motion";
import { ImagePlus, X } from "lucide-react";
import type { RefObject } from "react";
import type { PostFields, StoredPost } from "@/domain/post";
import type { usePinnedOrder } from "./use-pinned-order";
import type { usePostPersistence } from "./use-post-persistence";
import type { useWriterFeedback } from "./use-writer-feedback";
import { PinnedCards, WriterCheckbox } from "./writer-controls";
import { StatefulButton } from "./stateful-button";
import styles from "./writer.module.css";

const imageFields: ("coverImage" | "galleryImage")[] = [
  "coverImage",
  "galleryImage",
];
const conflictChoices: ["latest" | "draft", string][] = [
  ["latest", "최신 고정 목록 사용"],
  ["draft", "내 고정 변경 반영"],
];

type Props = {
  publishDialog: RefObject<HTMLDialogElement | null>;
  fields: PostFields;
  publishMode: boolean;
  initial: StoredPost | null;
  initialSha: string | null;
  writable: boolean;
  editorReady: boolean;
  currentPin: string;
  pins: ReturnType<typeof usePinnedOrder>;
  persistence: Pick<
    ReturnType<typeof usePostPersistence>,
    "sha" | "save" | "storeDraft" | "remove"
  >;
  feedback: Pick<
    ReturnType<typeof useWriterFeedback>,
    "busy" | "message" | "setMessage" | "setFeedback" | "buttonState"
  >;
  update: (values: Partial<PostFields>) => void;
  chooseImage: (target: "coverImage" | "galleryImage") => void;
  onDirty: () => void;
};

export function PublishDialog({
  publishDialog,
  fields,
  publishMode,
  initial,
  initialSha,
  writable,
  editorReady,
  currentPin,
  pins,
  persistence,
  feedback,
  update,
  chooseImage,
  onDirty,
}: Props) {
  const { order: pinnedOrder, setOrder: setPinnedOrder } = pins;
  const { sha, save, storeDraft, remove } = persistence;
  const { busy, message, setMessage, setFeedback, buttonState } = feedback;
  return (
    <motion.dialog
      layoutScroll
      ref={publishDialog}
      className={styles.publishDialog}
      aria-labelledby="publish-heading"
      onCancel={(e) => {
        if (busy) e.preventDefault();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy)
          publishDialog.current?.close();
      }}
    >
      <div className={styles.dialogHeading}>
        <div>
          <p className="section-label">PUBLISH</p>
          <h2 id="publish-heading">
            {publishMode ? "발행 설정" : "임시 저장"}
          </h2>
        </div>
        <button
          type="button"
          aria-label="발행 설정 닫기"
          disabled={busy}
          onClick={() => publishDialog.current?.close()}
        >
          <X size={20} />
        </button>
      </div>
      <motion.div
        layoutScroll
        className={styles.dialogBody}
        role="region"
        aria-label="발행 옵션"
      >
        <fieldset className={styles.stack} disabled={busy}>
          <div className={styles.fields}>
            {imageFields
              .filter(
                (key) => key === "coverImage" || fields.category.slug === "art",
              )
              .map((key) => (
                <div key={key} className={styles.stack}>
                  <label>
                    {key === "coverImage" ? "대표 이미지" : "갤러리 이미지"}
                    <input
                      type="url"
                      value={fields[key]?.src ?? ""}
                      onChange={(e) =>
                        update({ [key]: { src: e.target.value } })
                      }
                      placeholder="https://…"
                    />
                  </label>
                  <button type="button" onClick={() => chooseImage(key)}>
                    <ImagePlus size={16} />
                    파일 선택
                  </button>
                </div>
              ))}
          </div>
          <section
            className={styles.pinnedSection}
            aria-labelledby="pinned-heading"
          >
            <div className={styles.pinnedHeading}>
              <h3 id="pinned-heading">Pinned</h3>
              <WriterCheckbox
                ariaLabel="Pinned"
                checked={fields.featured}
                disabled={busy}
                onChange={(checked) => {
                  update({ featured: checked });
                  setPinnedOrder((order) =>
                    checked
                      ? order.includes(currentPin)
                        ? order
                        : [...order, currentPin]
                      : order.filter((value) => value !== currentPin),
                  );
                }}
              />
            </div>
            {pins.conflict && (
              <div className={styles.notice} role="alert">
                <p>
                  Pinned 목록이 변경되었습니다. 본문은 유지됩니다. 최신 목록을
                  사용하거나 내 순서·해제 변경을 반영한 뒤 확인해 주세요. 새로
                  고정된 글은 유지하고 해제된 글은 제외합니다.
                </p>
                <div className={styles.recoveryActions}>
                  {conflictChoices.map(([choice, label]) => (
                    <button
                      key={choice}
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        pins.resolve(choice, fields.featured);
                        onDirty();
                        setMessage("");
                        setFeedback(null);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <PinnedCards
              posts={[
                ...pins.posts.filter((post) => post.slug !== currentPin),
                {
                  slug: currentPin,
                  title: fields.title,
                  coverImage: fields.coverImage,
                },
              ]}
              order={pinnedOrder}
              disabled={busy}
              onReorder={(order) => {
                setPinnedOrder(order);
                onDirty();
              }}
              onRemove={(slug) => {
                setPinnedOrder((order) =>
                  order.filter((value) => value !== slug),
                );
                if (slug === currentPin) update({ featured: false });
                else onDirty();
              }}
            />
          </section>
          {!writable && publishMode && (
            <p className={styles.notice}>현재 발행할 수 없습니다.</p>
          )}
        </fieldset>
      </motion.div>
      <p role="status" className={styles.dialogStatus}>
        {message}
      </p>
      <div className={styles.dialogActions}>
        {initial && sha && (
          <StatefulButton
            type="button"
            state={buttonState("delete")}
            label="삭제"
            loadingLabel="삭제 중"
            successLabel="삭제 완료"
            disabled={busy || !writable}
            onClick={remove}
          />
        )}
        <StatefulButton
          className={styles.primary}
          type="button"
          onClick={() => (publishMode ? save(true) : storeDraft())}
          disabled={
            busy ||
            (publishMode && (!writable || Boolean(pins.conflict))) ||
            !editorReady
          }
          state={buttonState(publishMode ? "publish" : "draft")}
          label={
            publishMode ? (initialSha ? "수정 완료" : "발행") : "임시 저장"
          }
          loadingLabel={
            publishMode ? (initialSha ? "수정 중" : "발행 중") : "저장 중"
          }
          successLabel={
            publishMode ? (initialSha ? "수정 완료" : "발행 완료") : "저장 완료"
          }
        />
      </div>
    </motion.dialog>
  );
}
