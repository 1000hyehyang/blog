"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import styles from "./image-viewer.module.css";

type ViewerImage = { src: string; alt: string; caption: string };
type Selection = {
  images: ViewerImage[];
  index: number;
  trigger: HTMLImageElement;
};

function getImages(root: HTMLElement) {
  return Array.from(
    root.querySelectorAll<HTMLImageElement>(
      ".markdown-image, .markdown-image-group img",
    ),
  ).filter((image) => image.getAttribute("src") && !image.closest("a, button"));
}

/** Enhance the existing images without changing their layout or linked images. */
export function ImageViewer({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<Selection | null>(null);

  useEffect(() => {
    if (!root.current) return;
    const images = getImages(root.current);
    for (const image of images) {
      image.setAttribute("role", "button");
      image.setAttribute("tabindex", "0");
      image.setAttribute("aria-haspopup", "dialog");
      image.setAttribute("aria-label", `${image.alt || "이미지"} 확대 보기`);
    }
    return () => {
      for (const image of images) {
        for (const attribute of [
          "role",
          "tabindex",
          "aria-haspopup",
          "aria-label",
        ])
          image.removeAttribute(attribute);
      }
    };
  }, [children]);

  const open = (target: EventTarget | null) => {
    if (!(target instanceof HTMLImageElement) || !root.current) return;
    const images = getImages(root.current);
    const index = images.indexOf(target);
    if (index < 0) return;
    setSelection({
      index,
      trigger: target,
      images: images.map((image) => ({
        src: image.getAttribute("src")!,
        alt: image.alt,
        caption:
          image.dataset.imageCaption ||
          image.closest<HTMLElement>("[data-image-caption]")?.dataset
            .imageCaption ||
          image.alt,
      })),
    });
  };

  return (
    <div
      ref={root}
      className="prose"
      onClick={(event) => {
        if (!event.defaultPrevented && !event.ctrlKey && !event.metaKey)
          open(event.target);
      }}
      onKeyDown={(event) => {
        if (
          (event.key === "Enter" || event.key === " ") &&
          event.target instanceof HTMLImageElement &&
          event.target.getAttribute("role") === "button"
        ) {
          event.preventDefault();
          open(event.target);
        }
      }}
    >
      {children}
      {selection &&
        createPortal(
          <ViewerDialog
            selection={selection}
            onClose={() => setSelection(null)}
          />,
          document.body,
        )}
    </div>
  );
}

function ViewerDialog({
  selection,
  onClose,
}: {
  selection: Selection;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [index, setIndex] = useState(selection.index);
  const [direction, setDirection] = useState(1);
  const image = selection.images[index];
  const move = (delta: number) => {
    const next = index + delta;
    if (next < 0 || next >= selection.images.length) return;
    setDirection(delta);
    setIndex(next);
  };

  useLayoutEffect(() => {
    const element = dialog.current;
    const focused = document.activeElement;
    if (
      element?.open &&
      (!element.contains(focused) ||
        (focused instanceof HTMLButtonElement && focused.disabled))
    )
      closeButton.current?.focus({ preventScroll: true });
  }, [index]);

  useEffect(() => {
    const element = dialog.current!;
    const html = document.documentElement;
    const overflow = html.style.overflow;
    const paddingRight = html.style.paddingRight;
    const scrollbar = window.innerWidth - html.clientWidth;
    html.style.paddingRight = `${(parseFloat(getComputedStyle(html).paddingRight) || 0) + scrollbar}px`;
    html.style.overflow = "hidden";
    element.showModal();
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      element.close();
      html.style.overflow = overflow;
      html.style.paddingRight = paddingRight;
      if (selection.trigger.isConnected)
        selection.trigger.focus({ preventScroll: true });
    };
  }, [selection]);

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-label="이미지 뷰어"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Tab") {
          const buttons =
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            );
          const first = buttons[0];
          const last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
          return;
        }
        if (
          event.defaultPrevented ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey
        )
          return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <div className={styles.panel}>
        <div className={styles.header}>
          <span
            className={styles.counter}
            aria-live="polite"
            aria-atomic="true"
          >
            {index + 1} / {selection.images.length}
          </span>
          <button
            ref={closeButton}
            type="button"
            className={styles.control}
            aria-label="이미지 뷰어 닫기"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <ViewerFrame
          key={index}
          image={image}
          direction={direction}
          onMove={move}
          onClose={onClose}
        />
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.control}
            aria-label="이전 이미지"
            disabled={index === 0}
            onClick={() => move(-1)}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <p className={styles.caption} aria-live="polite">
            {image.caption}
          </p>
          <button
            type="button"
            className={styles.control}
            aria-label="다음 이미지"
            disabled={index === selection.images.length - 1}
            onClick={() => move(1)}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
    </dialog>
  );
}

function ViewerFrame({
  image,
  direction,
  onMove,
  onClose,
}: {
  image: ViewerImage;
  direction: number;
  onMove: (delta: number) => void;
  onClose: () => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );
  const reduceMotion = useReducedMotion();
  const dragged = useRef(false);

  useLayoutEffect(() => {
    const element = viewport.current!;
    element.scrollLeft = zoomed
      ? (element.scrollWidth - element.clientWidth) / 2
      : 0;
    element.scrollTop = zoomed
      ? (element.scrollHeight - element.clientHeight) / 2
      : 0;
  }, [zoomed]);

  return (
    <div className={styles.frame}>
      <div
        ref={viewport}
        className={styles.viewport}
        data-zoomed={zoomed}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          dragged.current = false;
          gesture.current = {
            x: event.clientX,
            y: event.clientY,
            left: event.currentTarget.scrollLeft,
            top: event.currentTarget.scrollTop,
          };
        }}
        onPointerMove={(event) => {
          const start = gesture.current;
          if (!start) return;
          if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5)
            dragged.current = true;
          if (!zoomed) return;
          event.currentTarget.scrollLeft = start.left + start.x - event.clientX;
          event.currentTarget.scrollTop = start.top + start.y - event.clientY;
        }}
        onPointerUp={(event) => {
          const start = gesture.current;
          gesture.current = null;
          if (!start || zoomed) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5)
            onMove(dx < 0 ? 1 : -1);
        }}
        onPointerCancel={() => {
          gesture.current = null;
        }}
        onLostPointerCapture={() => {
          gesture.current = null;
        }}
        onDoubleClick={() => {
          if (status === "loaded") setZoomed((current) => !current);
        }}
        onClick={(event) => {
          if (zoomed || dragged.current || status !== "loaded") return;
          const element = event.currentTarget.querySelector("img")!;
          const bounds = event.currentTarget.getBoundingClientRect();
          const ratio = element.naturalWidth / element.naturalHeight;
          const width = Math.min(bounds.width, bounds.height * ratio);
          const height = Math.min(bounds.height, bounds.width / ratio);
          if (
            Math.abs(event.clientX - (bounds.left + bounds.width / 2)) >
              width / 2 ||
            Math.abs(event.clientY - (bounds.top + bounds.height / 2)) >
              height / 2
          )
            onClose();
        }}
      >
        <motion.div
          className={styles.canvas}
          data-zoomed={zoomed}
          initial={{ opacity: 0, x: reduceMotion ? 0 : direction * 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        >
          {/* Original URLs keep external hosts, animated images and full resolution available. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.image}
            src={image.src}
            alt={image.alt}
            draggable={false}
            onLoad={() => setStatus("loaded")}
            onError={() => setStatus("error")}
            style={{ visibility: status === "error" ? "hidden" : undefined }}
          />
        </motion.div>
      </div>
      {status !== "loaded" && (
        <p className={styles.status} role="status">
          {status === "error"
            ? "이미지를 불러올 수 없습니다."
            : "이미지를 불러오는 중…"}
        </p>
      )}
    </div>
  );
}
