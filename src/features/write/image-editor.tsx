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
  Images,
  LayoutGrid,
  GalleryHorizontal,
  ArrowLeft,
  ArrowRight,
  Trash2,
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
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { ImageGroupDisplay } from "@/components/image-group";
import {
  ImagePhotoActions,
  photoActionClassName,
} from "@/components/image-photo-actions";
import {
  asImageGroup,
  type ImageGroup,
  type ImageGroupLayout,
} from "@/lib/image-group";
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
  let previousPosition = -1;
  let previousIndex = 0;
  transaction.before.descendants((node, position) => {
    if (node.type.name !== "image" || previousPosition !== -1) return;
    const sources = asImageGroup(node.attrs)?.images.map(
      (image) => image.src,
    ) ?? [node.attrs.src];
    const index = sources.indexOf(src);
    if (index !== -1) {
      previousPosition = position;
      previousIndex = index;
    }
  });
  if (previousPosition === -1) return src;
  let stillPresent = false;
  transaction.doc.descendants((node) => {
    if (node.type.name !== "image") return;
    const group = asImageGroup(node.attrs);
    if (
      group?.images.some((image) => image.src === src) ||
      node.attrs.src === src
    )
      stillPresent = true;
  });
  if (stillPresent) return src;
  let mappedPosition = previousPosition;
  for (const map of transaction.mapping.maps) {
    let deleted = false;
    map.forEach((oldStart, oldEnd, newStart, newEnd) => {
      if (
        oldStart <= mappedPosition &&
        mappedPosition < oldEnd &&
        newStart === newEnd
      )
        deleted = true;
    });
    if (deleted) return "";
    mappedPosition = map.map(mappedPosition);
  }
  const replacement = transaction.doc.nodeAt(mappedPosition);
  if (replacement?.type.name !== "image") return "";
  const group = asImageGroup(replacement.attrs);
  return group
    ? group.images[Math.min(previousIndex, group.images.length - 1)].src
    : replacement.attrs.src;
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

type ImageAttrs = ImageMetadata &
  Partial<ImageGroup> & { src: string; alt: string | null };

function adjacentPlainImages(editor: Editor, position: number) {
  const nodes: { node: ProseMirrorNode; position: number }[] = [];
  editor.state.doc.forEach((node, offset) => {
    nodes.push({ node, position: offset });
  });
  const plain = ({ node }: (typeof nodes)[number]) =>
    node.type.name === "image" &&
    node.attrs.layout == null &&
    node.attrs.align === "center" &&
    node.attrs.width === 100 &&
    !node.attrs.caption &&
    !node.attrs.title;
  const index = nodes.findIndex((item) => item.position === position);
  if (index === -1 || !plain(nodes[index])) return null;
  const batchId = nodes[index].node.attrs.batchId;
  if (!batchId) return null;
  let first = index;
  let last = index;
  while (
    first > 0 &&
    plain(nodes[first - 1]) &&
    nodes[first - 1].node.attrs.batchId === batchId
  )
    first--;
  while (
    last + 1 < nodes.length &&
    plain(nodes[last + 1]) &&
    nodes[last + 1].node.attrs.batchId === batchId
  )
    last++;
  const images = nodes.slice(first, last + 1).map(({ node }) => ({
    src: node.attrs.src as string,
    alt: (node.attrs.alt as string | null) ?? "",
  }));
  return asImageGroup({ layout: "collage", images })
    ? {
        from: nodes[first].position,
        to: nodes[last].position + nodes[last].node.nodeSize,
        images,
      }
    : null;
}

export function ImageNodeView(props: NodeViewProps) {
  const group = asImageGroup(props.node.attrs);
  return group ? (
    <ImageGroupNodeView {...props} group={group} />
  ) : (
    <SingleImageNodeView {...props} />
  );
}

function SingleImageNodeView({
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
  const pos = getPos();
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
  const activeRepresentative = representative && firstCoverPosition === pos;
  const nearbyImages =
    showControls && typeof pos === "number"
      ? adjacentPlainImages(editor, pos)
      : null;
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
          {nearbyImages && (
            <>
              <span className={styles.imageToolbarDivider} />
              {(
                [
                  ["collage", "콜라주로 묶기"],
                  ["slide", "슬라이드로 묶기"],
                ] as const
              ).map(([layout, label]) => (
                <button
                  key={layout}
                  type="button"
                  aria-label={label}
                  onClick={() =>
                    editor
                      .chain()
                      .focus()
                      .insertContentAt(
                        { from: nearbyImages.from, to: nearbyImages.to },
                        {
                          type: "image",
                          attrs: {
                            ...nearbyImages.images[0],
                            layout,
                            images: nearbyImages.images,
                          },
                        },
                      )
                      .setNodeSelection(nearbyImages.from)
                      .run()
                  }
                >
                  {layout === "collage" ? (
                    <LayoutGrid size={18} aria-hidden="true" />
                  ) : (
                    <GalleryHorizontal size={18} aria-hidden="true" />
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}
      <div
        className={`${styles.imageFrame} ${photoActionClassName}`}
        data-current={showControls || undefined}
        onPointerDown={(event) => {
          if (event.target instanceof Element && event.target.closest("button"))
            return;
          event.preventDefault();
          select();
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt ?? ""} draggable={false} />
        {editor.isEditable && (
          <ImagePhotoActions
            active={activeRepresentative}
            coverLabel="대표 이미지로 설정"
            removeLabel="사진 삭제"
            onCover={() =>
              context?.onCoverImageChange(representative ? "" : src)
            }
            onRemove={() => {
              const position = getPos();
              if (typeof position === "number")
                editor.commands.deleteRange({
                  from: position,
                  to: position + node.nodeSize,
                });
            }}
          />
        )}
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

function ImageGroupNodeView({
  editor,
  node,
  selected,
  updateAttributes,
  getPos,
  group,
}: NodeViewProps & { group: ImageGroup }) {
  const context = useContext(ImageContext);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const showControls = selected && Boolean(context?.active);
  const currentIndex = Math.min(selectedIndex, group.images.length - 1);
  const caption = node.attrs.caption as string;
  const select = () => {
    context?.onSelect();
    const pos = getPos();
    if (typeof pos === "number") {
      editor.view.focus();
      editor.commands.setNodeSelection(pos);
    }
  };
  const replaceImages = (images: ImageGroup["images"]) =>
    updateAttributes({ images, src: images[0].src, alt: images[0].alt });
  const move = (direction: -1 | 1) => {
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= group.images.length) return;
    const images = [...group.images];
    [images[currentIndex], images[nextIndex]] = [
      images[nextIndex],
      images[currentIndex],
    ];
    replaceImages(images);
    setSelectedIndex(nextIndex);
  };
  const remove = (removedIndex: number) => {
    const images = group.images.filter((_, index) => index !== removedIndex);
    if (images.length === 1) {
      const pos = getPos();
      if (typeof pos === "number")
        editor.commands.insertContentAt(
          { from: pos, to: pos + node.nodeSize },
          { type: "image", attrs: { ...images[0], caption } },
        );
    } else replaceImages(images);
    setSelectedIndex(Math.min(removedIndex, images.length - 1));
  };
  const changeLayout = (layout: ImageGroupLayout) => {
    if (layout !== "individual") {
      updateAttributes({ layout });
      return;
    }
    const pos = getPos();
    if (typeof pos === "number") {
      const batchId = crypto.randomUUID();
      editor.commands.insertContentAt(
        { from: pos, to: pos + node.nodeSize },
        group.images.map((image, index) => ({
          type: "image",
          attrs: { ...image, batchId, caption: index === 0 ? caption : "" },
        })),
      );
    }
  };

  return (
    <NodeViewWrapper
      as="figure"
      className={styles.imageGroupFigure}
      data-selected={showControls || undefined}
      contentEditable={false}
      onClick={select}
    >
      {showControls && editor.isEditable && (
        <div
          className={styles.imageGroupToolbar}
          role="group"
          aria-label="사진 묶음 설정"
          onMouseDown={(event) => event.preventDefault()}
        >
          {(
            [
              ["individual", "개별사진", Images],
              ["collage", "콜라주", LayoutGrid],
              ["slide", "슬라이드", GalleryHorizontal],
            ] as const
          ).map(([layout, label, Icon]) => (
            <button
              key={layout}
              type="button"
              aria-label={label}
              title={label}
              aria-pressed={group.layout === layout}
              onClick={() => changeLayout(layout)}
            >
              <Icon size={18} aria-hidden="true" />
            </button>
          ))}
          <span className={styles.imageToolbarDivider} />
          <button
            type="button"
            aria-label="사진을 앞으로 이동"
            disabled={currentIndex === 0}
            onClick={() => move(-1)}
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="사진을 뒤로 이동"
            disabled={currentIndex === group.images.length - 1}
            onClick={() => move(1)}
          >
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="묶음 삭제"
            onClick={(event) => {
              event.stopPropagation();
              const pos = getPos();
              if (typeof pos === "number")
                editor.commands.deleteRange({
                  from: pos,
                  to: pos + node.nodeSize,
                });
            }}
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
      )}
      <ImageGroupDisplay
        images={group.images}
        layout={group.layout}
        coverSrc={context?.coverImageSrc}
        selectedIndex={showControls ? currentIndex : undefined}
        onImageClick={
          editor.isEditable
            ? (index) => {
                setSelectedIndex(index);
                select();
              }
            : undefined
        }
        onCoverClick={
          editor.isEditable
            ? (index) => {
                const src = group.images[index].src;
                context?.onCoverImageChange(
                  context.coverImageSrc === src ? "" : src,
                );
              }
            : undefined
        }
        onRemoveClick={editor.isEditable ? remove : undefined}
      />
      {(showControls || caption) && (
        <figcaption className={styles.imageFigcaption}>
          {showControls && editor.isEditable ? (
            <input
              aria-label="묶음 캡션"
              maxLength={300}
              defaultValue={caption}
              placeholder="사진을 설명해 보세요"
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
