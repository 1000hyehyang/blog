"use client";

import {
  AnimatePresence,
  motion,
  Reorder,
  useDragControls,
  useReducedMotion,
} from "framer-motion";
import { Check, ChevronDown, GripVertical, ImageIcon, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { PinnedPost } from "./pinned-posts";
import { IconButton } from "./icon-button";
import styles from "./writer.module.css";

export function WriterSelect({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<CSSProperties | null>(null);
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const open = Boolean(position) && !disabled;
  function expand(
    index = options.findIndex((option) => option.value === value),
  ) {
    const rect = trigger.current!.getBoundingClientRect();
    setActive(Math.max(0, index));
    const below = window.innerHeight - rect.bottom;
    setPosition({
      position: "fixed",
      left: Math.min(rect.left, window.innerWidth - 200),
      width: Math.max(rect.width, 180),
      ...(below > 250
        ? { top: rect.bottom + 8, maxHeight: below - 20 }
        : {
            bottom: window.innerHeight - rect.top + 8,
            maxHeight: rect.top - 20,
          }),
    });
  }
  function select(index: number) {
    setPosition(null);
    trigger.current?.focus();
    onChange(options[index].value);
  }
  useEffect(() => {
    if (!open) return;
    function dismiss(event: Event) {
      if (
        !trigger.current?.contains(event.target as Node) &&
        !list.current?.contains(event.target as Node)
      )
        setPosition(null);
    }
    const resize = () => setPosition(null);
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", resize);
    };
  }, [open]);
  useEffect(() => {
    if (open)
      list.current?.children[active]?.scrollIntoView?.({ block: "nearest" });
  }, [active, open]);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        disabled={disabled}
        className={styles.selectTrigger}
        onClick={() => (open ? setPosition(null) : expand())}
        onBlur={() => setPosition(null)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.preventDefault();
            event.stopPropagation();
            setPosition(null);
          } else if (
            ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
          ) {
            event.preventDefault();
            const index =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? options.length - 1
                  : Math.max(
                      0,
                      Math.min(
                        options.length - 1,
                        active + (event.key === "ArrowDown" ? 1 : -1),
                      ),
                    );
            if (!open) expand();
            else setActive(index);
          } else if (open && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            select(active);
          } else if (
            event.key.length === 1 &&
            event.key !== " " &&
            !event.ctrlKey &&
            !event.metaKey
          ) {
            const index = options.findIndex((option) =>
              option.label.toLowerCase().startsWith(event.key.toLowerCase()),
            );
            if (index >= 0) {
              event.preventDefault();
              if (open) setActive(index);
              else expand(index);
            }
          }
        }}
      >
        <span>{options.find((option) => option.value === value)?.label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
        >
          <ChevronDown size={15} />
        </motion.span>
      </button>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={list}
                id={id}
                role="listbox"
                aria-label={label}
                className={styles.selectMenu}
                style={position!}
                initial={{ opacity: 0, y: reduced ? 0 : -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.16 }}
              >
                {options.map((option, index) => (
                  <button
                    key={option.value}
                    id={`${id}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    tabIndex={-1}
                    data-active={index === active}
                    onPointerMove={() => setActive(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => select(index)}
                  >
                    <span>{option.label}</span>
                    {option.value === value && <Check size={16} />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

export function WriterCheckbox({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <label className={styles.checkbox}>
      <input
        type="checkbox"
        aria-label="Pinned"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={styles.checkboxBox} aria-hidden="true">
        <svg viewBox="0 0 20 20">
          <motion.path
            d="m4 10 4 4 8-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
          />
        </svg>
      </span>
    </label>
  );
}

export function PinnedCards({
  posts,
  order,
  disabled,
  onReorder,
  onRemove,
}: {
  posts: PinnedPost[];
  order: string[];
  disabled: boolean;
  onReorder: (order: string[]) => void;
  onRemove: (slug: string) => void;
}) {
  const [announcement, setAnnouncement] = useState("");
  function move(slug: string, direction: number) {
    const from = order.indexOf(slug),
      to = from + direction;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[from], next[to]] = [next[to], next[from]];
    onReorder(next);
    setAnnouncement(
      `${posts.find((post) => post.slug === slug)?.title}, ${order.length}개 중 ${to + 1}번째`,
    );
  }
  function remove(slug: string) {
    onRemove(slug);
    setAnnouncement(
      `${posts.find((post) => post.slug === slug)?.title}, Pinned 해제`,
    );
  }
  return (
    <>
      {order.length ? (
        <Reorder.Group
          axis="y"
          values={order}
          onReorder={(next) => {
            if (!disabled) onReorder(next);
          }}
          className={styles.pinnedList}
        >
          {order.map((slug) => (
            <PinnedCard
              key={slug}
              post={posts.find((post) => post.slug === slug)!}
              disabled={disabled}
              onMove={(direction) => move(slug, direction)}
              onRemove={() => remove(slug)}
            />
          ))}
        </Reorder.Group>
      ) : (
        <p className={styles.pinnedEmpty}>Pinned 된 글이 없습니다.</p>
      )}
      <span role="status" className="sr-only">
        {announcement}
      </span>
    </>
  );
}

function PinnedCard({
  post,
  disabled,
  onMove,
  onRemove,
}: {
  post: PinnedPost;
  disabled: boolean;
  onMove: (direction: number) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  const reduced = useReducedMotion();
  return (
    <Reorder.Item
      value={post.slug}
      dragListener={false}
      dragControls={controls}
      className={styles.pinnedCard}
      transition={
        reduced
          ? { duration: 0 }
          : { type: "spring", stiffness: 420, damping: 35 }
      }
    >
      <span className={styles.pinnedThumbnail}>
        {post.coverImage.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverImage.src} alt="" draggable={false} />
        ) : (
          <ImageIcon size={22} />
        )}
      </span>
      <span className={styles.pinnedTitle}>{post.title || "제목 없음"}</span>
      <button
        type="button"
        className={styles.dragHandle}
        aria-label={`${post.title || "제목 없음"} 순서 이동`}
        disabled={disabled}
        onPointerDown={(event) => {
          if (!disabled) controls.start(event);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            onMove(event.key === "ArrowUp" ? -1 : 1);
          }
        }}
      >
        <GripVertical size={20} />
      </button>
      <IconButton
        label={`${post.title || "제목 없음"} Pinned 해제`}
        className={styles.pinnedRemove}
        disabled={disabled}
        onClick={onRemove}
      >
        <X size={18} />
      </IconButton>
    </Reorder.Item>
  );
}
