"use client";

import type { RefObject } from "react";
import { Images, LayoutGrid, GalleryHorizontal } from "lucide-react";
import type { GroupImage, ImageGroupLayout } from "@/lib/image-group";
import styles from "./writer.module.css";

export type PendingImage = {
  file: File;
  preview: string;
  uploaded?: GroupImage;
};

export function ImageLayoutDialog({
  dialogRef,
  images,
  layout,
  error,
  busy,
  onLayoutChange,
  onConfirm,
  onClose,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  images: PendingImage[];
  layout: ImageGroupLayout;
  error: string;
  busy: boolean;
  onLayoutChange: (layout: ImageGroupLayout) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <dialog
      ref={dialogRef}
      className={styles.imageLayoutDialog}
      aria-labelledby="image-layout-title"
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
    >
      <button
        type="button"
        className={styles.imageLayoutClose}
        aria-label="사진 첨부 방식 닫기"
        disabled={busy}
        onClick={() => dialogRef.current?.close()}
      >
        ×
      </button>
      <h2 id="image-layout-title">사진 첨부 방식</h2>
      <p>첨부되는 사진들의 레이아웃을 선택할 수 있습니다.</p>
      <div
        className={styles.imageLayoutChoices}
        role="group"
        aria-label="사진 배치"
      >
        {(
          [
            ["individual", "개별사진", Images],
            ["collage", "콜라주", LayoutGrid],
            ["slide", "슬라이드", GalleryHorizontal],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            className={styles.imageLayoutChoice}
            aria-label={label}
            title={label}
            data-selected={layout === value || undefined}
            aria-pressed={layout === value}
            disabled={busy}
            onClick={() => onLayoutChange(value)}
          >
            <span className={styles.imageLayoutExample} data-layout={value}>
              {images.slice(0, 4).map((image, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={index}
                  src={image.preview}
                  alt=""
                  onLoad={(event) =>
                    (event.currentTarget.dataset.loaded = "true")
                  }
                />
              ))}
            </span>
            <Icon size={22} aria-hidden="true" />
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className={styles.imageLayoutError}>
          {error}
        </p>
      )}
      <button
        type="button"
        className={styles.imageLayoutConfirm}
        disabled={busy || images.length < 2}
        onClick={onConfirm}
      >
        {busy ? "사진 업로드 중…" : error ? "업로드 재시도" : "본문에 삽입"}
      </button>
    </dialog>
  );
}
