"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { GroupImage, ImageGroupLayout } from "@/lib/image-group";
import { ImagePhotoActions, photoActionClassName } from "./image-photo-actions";
import styles from "./image-group.module.css";

export function ImageGroupDisplay({
  images,
  layout,
  caption,
  coverSrc,
  selectedIndex,
  onImageClick,
  onCoverClick,
  onRemoveClick,
  className = "",
}: {
  images: GroupImage[];
  layout: ImageGroupLayout;
  caption?: string;
  coverSrc?: string;
  selectedIndex?: number;
  onImageClick?: (index: number) => void;
  onCoverClick?: (index: number) => void;
  onRemoveClick?: (index: number) => void;
  className?: string;
}) {
  const groupRef = useRef<HTMLSpanElement>(null);
  const viewport = useRef<HTMLSpanElement>(null);
  const [index, setIndex] = useState(0);
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!groupRef.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(groupRef.current);
    return () => observer.disconnect();
  }, []);
  const firstRatio = ratios[images[0]?.src] ?? 1;
  const secondRatio = ratios[images[1]?.src] ?? 1;
  const slideHeight = width
    ? Math.max(
        150,
        Math.min(
          496,
          width / (firstRatio + secondRatio + (images.length > 2 ? 0.18 : 0)),
        ),
      )
    : undefined;
  const go = (next: number) => {
    if (next < 0 || next >= images.length) return;
    const item =
      viewport.current?.querySelectorAll<HTMLElement>("[data-slide-item]")[
        next
      ];
    if (item && viewport.current)
      viewport.current.scrollTo({
        left: item.offsetLeft - viewport.current.offsetLeft,
        behavior: "smooth",
      });
    setIndex(next);
    onImageClick?.(next);
  };
  const renderItem = (imageIndex: number) => {
    const image = images[imageIndex];
    const activeCover = coverSrc === image.src;
    const content = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image.src}
        alt={image.alt}
        loading="lazy"
        draggable={false}
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (naturalWidth && naturalHeight) {
            const ratio = naturalWidth / naturalHeight;
            setRatios((current) =>
              current[image.src] === ratio
                ? current
                : { ...current, [image.src]: ratio },
            );
          }
        }}
      />
    );
    return (
      <span
        key={`${image.src}-${imageIndex}`}
        className={`${styles.item} ${photoActionClassName}`}
        data-current={selectedIndex === imageIndex || undefined}
        data-slide-item={layout === "slide" || undefined}
        style={
          layout === "collage"
            ? { flexGrow: ratios[image.src] ?? 1 }
            : undefined
        }
      >
        {onImageClick ? (
          <button
            type="button"
            className={styles.select}
            aria-label={`${imageIndex + 1}번째 사진 선택`}
            onClick={() => onImageClick(imageIndex)}
          >
            {content}
          </button>
        ) : (
          content
        )}
        {onCoverClick && onRemoveClick && (
          <ImagePhotoActions
            active={activeCover}
            coverLabel={`${imageIndex + 1}번째 사진을 대표 이미지로 설정`}
            removeLabel={`${imageIndex + 1}번째 사진 삭제`}
            onCover={() => onCoverClick(imageIndex)}
            onRemove={() => onRemoveClick(imageIndex)}
          />
        )}
      </span>
    );
  };
  const rows: number[][] = [];
  if (layout === "collage")
    for (let start = 0; start < images.length;) {
      const count =
        images.length - start === 3 ? 3 : Math.min(2, images.length - start);
      rows.push(Array.from({ length: count }, (_, offset) => start + offset));
      start += count;
    }

  return (
    <span
      ref={groupRef}
      className={`${styles.group} ${className}`}
      data-layout={layout}
      style={
        slideHeight
          ? ({ "--slide-height": `${slideHeight}px` } as CSSProperties)
          : undefined
      }
    >
      <span
        ref={viewport}
        className={styles.images}
        onScroll={
          layout === "slide"
            ? (event) => {
                const items =
                  event.currentTarget.querySelectorAll<HTMLElement>(
                    "[data-slide-item]",
                  );
                const left =
                  event.currentTarget.scrollLeft +
                  event.currentTarget.offsetLeft;
                let closest = 0;
                items.forEach((item, itemIndex) => {
                  if (
                    Math.abs(item.offsetLeft - left) <
                    Math.abs(items[closest].offsetLeft - left)
                  )
                    closest = itemIndex;
                });
                setIndex(closest);
              }
            : undefined
        }
      >
        {layout === "collage"
          ? rows.map((row) => (
              <span className={styles.row} key={row[0]}>
                {row.map(renderItem)}
              </span>
            ))
          : images.map((_, imageIndex) => renderItem(imageIndex))}
      </span>
      {layout === "slide" && (
        <>
          <span className={styles.navigation}>
            <button
              type="button"
              aria-label="이전 사진"
              disabled={index === 0}
              onClick={() => go(index - 1)}
            >
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="다음 사진"
              disabled={index === images.length - 1}
              onClick={() => go(index + 1)}
            >
              <ChevronRight size={22} aria-hidden="true" />
            </button>
          </span>
          <span className={styles.progress} aria-hidden="true">
            <span
              style={{ width: `${((index + 1) / images.length) * 100}%` }}
            />
          </span>
          <span className={styles.srOnly} aria-live="polite">
            {index + 1} / {images.length}
          </span>
        </>
      )}
      {caption && <span className={styles.caption}>{caption}</span>}
    </span>
  );
}
