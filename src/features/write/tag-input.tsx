"use client";
import { useState } from "react";
import { X } from "lucide-react";
import styles from "./writer.module.css";

export function TagInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [composing, setComposing] = useState(false);
  const parts = value.split(",");
  const pending = parts.pop() ?? "";
  const tags = [
    ...new Set(
      parts.map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean),
    ),
  ];
  const prefix = tags.length ? `${tags.join(",")},` : "";
  function commit() {
    if (pending.trim())
      onChange(`${prefix}${pending.trim().replace(/^#/, "")},`);
  }
  return (
    <div className={styles.tags}>
      {tags.map((tag, index) => (
        <span className={styles.tagChip} key={tag}>
          #{tag}
          <button
            type="button"
            aria-label={`${tag} 태그 삭제`}
            onClick={() => {
              const rest = tags.filter((_, i) => i !== index);
              onChange(`${rest.length ? `${rest.join(",")},` : ""}${pending}`);
            }}
          >
            <X size={13} />
          </button>
        </span>
      ))}
      <input
        aria-label="태그"
        value={pending}
        placeholder="#태그 입력"
        maxLength={80}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => setComposing(false)}
        onChange={(event) => onChange(prefix + event.target.value)}
        onBlur={() => {
          if (!composing) commit();
        }}
        onKeyDown={(event) => {
          if (composing || event.nativeEvent.isComposing) return;
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
          if (event.key === "Backspace" && !pending && tags.length) {
            event.preventDefault();
            onChange(tags.join(","));
          }
        }}
      />
    </div>
  );
}
