"use client";
import { useId, useRef, useState, type ButtonHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import styles from "./writer.module.css";

export function IconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  function show() {
    if (props.disabled) return;
    const box = button.current!.getBoundingClientRect();
    setPosition({
      left: Math.max(64, Math.min(innerWidth - 64, box.x + box.width / 2)),
      top: box.bottom + 8,
    });
  }
  return (
    <>
      <button
        {...props}
        ref={button}
        type="button"
        aria-label={label}
        aria-describedby={position ? id : undefined}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") show();
        }}
        onPointerLeave={() => setPosition(null)}
        onFocus={show}
        onBlur={() => setPosition(null)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setPosition(null);
          props.onKeyDown?.(event);
        }}
      >
        {children}
      </button>
      {position &&
        createPortal(
          <span
            role="tooltip"
            id={id}
            className={styles.tooltip}
            style={position}
          >
            {label}
          </span>,
          document.body,
        )}
    </>
  );
}
