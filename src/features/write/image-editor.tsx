"use client";

import {
  EditorContent,
  NodeViewWrapper,
  type Editor,
  type NodeViewProps,
} from "@tiptap/react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Transaction } from "@tiptap/pm/state";
import type { ImageAlignment, ImageMetadata } from "@/lib/image-metadata";
import styles from "./writer.module.css";

const ImageContext = createContext<{
  coverImageSrc: string;
  onCoverImageChange: (src: string) => void;
  active: boolean;
  onSelect: () => void;
} | null>(null);

export function nextCoverImageSrc(transaction: Transaction, src: string) {
  if (!src) return src;
  let previousPosition: number | null = null;
  transaction.before.descendants((node, position) => {
    if (
      node.type.name === "image" &&
      node.attrs.src === src &&
      previousPosition === null
    )
      previousPosition = position;
  });
  if (previousPosition === null) return src;
  let stillPresent = false;
  transaction.doc.descendants((node) => {
    if (node.type.name === "image" && node.attrs.src === src)
      stillPresent = true;
  });
  if (stillPresent) return src;
  const replacement = transaction.doc.nodeAt(
    transaction.mapping.map(previousPosition),
  );
  return replacement?.type.name === "image" ? replacement.attrs.src : "";
}

export function ImageEditor({
  editor,
  coverImageSrc,
  onCoverImageChange,
}: {
  editor: Editor;
  coverImageSrc: string;
  onCoverImageChange: (src: string) => void;
}) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    let dismissTimer: number | undefined;
    const keyboardSelection = () => {
      if (editor.isFocused && editor.isActive("image")) setActive(true);
    };
    const dismiss = (event: PointerEvent) => {
      if (!editor.view.dom.contains(event.target as Node)) {
        window.clearTimeout(dismissTimer);
        dismissTimer = window.setTimeout(() => setActive(false), 0);
      }
    };
    editor.on("selectionUpdate", keyboardSelection);
    document.addEventListener("pointerdown", dismiss);
    return () => {
      window.clearTimeout(dismissTimer);
      editor.off("selectionUpdate", keyboardSelection);
      document.removeEventListener("pointerdown", dismiss);
    };
  }, [editor]);

  return (
    <ImageContext.Provider
      value={{
        coverImageSrc,
        onCoverImageChange,
        active,
        onSelect: () => setActive(true),
      }}
    >
      <EditorContent editor={editor} />
    </ImageContext.Provider>
  );
}

type ImageAttrs = ImageMetadata & { src: string; alt: string | null };

export function ImageNodeView({
  editor,
  node,
  selected,
  updateAttributes,
  getPos,
}: NodeViewProps) {
  const { src, alt, align, width, caption } = node.attrs as ImageAttrs;
  const context = useContext(ImageContext);
  const figure = useRef<HTMLElement>(null);
  const toolbar = useRef<HTMLDivElement>(null);
  const resizeCleanup = useRef<(() => void) | null>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const showControls = selected && Boolean(context?.active);
  useEffect(() => () => resizeCleanup.current?.(), []);
  useLayoutEffect(() => {
    if (!showControls || !toolbar.current) return;
    const keepOnScreen = () => {
      const element = toolbar.current;
      if (!element) return;
      element.style.translate = "0";
      const box = element.getBoundingClientRect();
      element.style.translate = `${Math.max(8 - box.left, 0) - Math.max(box.right - window.innerWidth + 8, 0)}px`;
    };
    keepOnScreen();
    window.addEventListener("resize", keepOnScreen);
    return () => window.removeEventListener("resize", keepOnScreen);
  }, [showControls, align, width, dragWidth]);
  const representative = Boolean(src && context?.coverImageSrc === src);
  let firstCoverPosition: number | null = null;
  if (representative)
    editor.state.doc.descendants((image, position) => {
      if (
        image.type.name === "image" &&
        image.attrs.src === src &&
        firstCoverPosition === null
      )
        firstCoverPosition = position;
    });
  const showBadge = representative && firstCoverPosition === getPos();
  const alignments = [
    { value: "left", label: "왼쪽 정렬", Icon: AlignLeft },
    { value: "center", label: "가운데 정렬", Icon: AlignCenter },
    { value: "right", label: "오른쪽 정렬", Icon: AlignRight },
  ] as const satisfies {
    value: ImageAlignment;
    label: string;
    Icon: typeof AlignLeft;
  }[];

  const select = () => {
    context?.onSelect();
    const pos = getPos();
    if (typeof pos === "number") {
      editor.view.focus();
      editor.commands.setNodeSelection(pos);
    }
  };
  const startResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!figure.current) return;
    resizeCleanup.current?.();
    event.preventDefault();
    event.stopPropagation();
    select();
    const parentWidth = Math.max(
      1,
      figure.current.parentElement?.clientWidth || figure.current.clientWidth,
    );
    const startWidth =
      (figure.current.getBoundingClientRect().width / parentWidth) * 100;
    const startX = event.clientX;
    let moved = false;
    const pointerId = event.pointerId;
    const factor =
      (event.currentTarget.dataset.corner?.endsWith("left") ? -1 : 1) *
      (align === "center" ? 2 : 1);
    const widthAt = (clientX: number) =>
      Math.min(
        100,
        Math.max(
          25,
          Math.round(
            startWidth + ((clientX - startX) * factor * 100) / parentWidth,
          ),
        ),
      );
    const move = (next: PointerEvent) => {
      if (next.pointerId !== pointerId) return;
      if (Math.abs(next.clientX - startX) > 2) moved = true;
      if (moved) setDragWidth(widthAt(next.clientX));
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", cancel);
      resizeCleanup.current = null;
    };
    const stop = (next: PointerEvent) => {
      if (next.pointerId !== pointerId) return;
      const value = widthAt(next.clientX);
      cleanup();
      setDragWidth(null);
      if (moved && value !== width) updateAttributes({ width: value });
    };
    const cancel = (next: PointerEvent) => {
      if (next.pointerId !== pointerId) return;
      cleanup();
      setDragWidth(null);
    };
    resizeCleanup.current = cleanup;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", cancel);
  };

  return (
    <NodeViewWrapper
      as="figure"
      ref={figure}
      className={styles.imageFigure}
      data-align={align}
      data-width={dragWidth ?? width}
      data-selected={showControls || undefined}
      style={{
        width:
          dragWidth === null && width === 100
            ? "fit-content"
            : `${dragWidth ?? width}%`,
      }}
      contentEditable={false}
      onClick={select}
    >
      {showControls && editor.isEditable && (
        <div
          ref={toolbar}
          className={styles.imageToolbar}
          role="group"
          aria-label="이미지 설정"
          onMouseDown={(event) => event.preventDefault()}
        >
          {alignments.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              aria-label={label}
              aria-pressed={align === value}
              onClick={() => updateAttributes({ align: value })}
            >
              <Icon size={18} />
            </button>
          ))}
          <span className={styles.imageToolbarDivider} />
          <button
            type="button"
            aria-label="대표 이미지로 설정"
            aria-pressed={representative}
            onClick={() =>
              context?.onCoverImageChange(representative ? "" : src)
            }
          >
            <ImageIcon size={18} />
            <span>대표</span>
          </button>
        </div>
      )}
      <div
        className={styles.imageFrame}
        onPointerDown={(event) => {
          if (event.target instanceof HTMLButtonElement) return;
          event.preventDefault();
          select();
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt ?? ""} draggable={false} />
        {showBadge && <span className={styles.imageRepresentative}>대표</span>}
        {showControls &&
          editor.isEditable &&
          (
            [
              ["top-left", "왼쪽 위"],
              ["top-right", "오른쪽 위"],
              ["bottom-left", "왼쪽 아래"],
              ["bottom-right", "오른쪽 아래"],
            ] as const
          ).map(([corner, label]) => (
            <button
              key={corner}
              type="button"
              className={styles.imageResize}
              data-corner={corner}
              aria-label={`${label} 이미지 크기 조절`}
              onPointerDown={startResize}
            />
          ))}
      </div>
      {(showControls || caption) && (
        <figcaption className={styles.imageFigcaption}>
          {showControls && editor.isEditable ? (
            <input
              aria-label="캡션"
              maxLength={300}
              defaultValue={caption}
              placeholder="이미지를 설명해 보세요"
              onClick={(event) => event.stopPropagation()}
              onBlur={(event) => {
                if (event.target.value !== caption)
                  updateAttributes({ caption: event.target.value });
              }}
            />
          ) : (
            caption
          )}
        </figcaption>
      )}
    </NodeViewWrapper>
  );
}
