import { Check, Trash2 } from "lucide-react";
import styles from "./image-photo-actions.module.css";

export const photoActionClassName = styles.photo;

export function ImagePhotoActions({
  active,
  coverLabel,
  removeLabel,
  onCover,
  onRemove,
}: {
  active: boolean;
  coverLabel: string;
  removeLabel: string;
  onCover: () => void;
  onRemove: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className={styles.cover}
        data-active={active || undefined}
        aria-label={coverLabel}
        aria-pressed={active}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          event.stopPropagation();
          onCover();
        }}
      >
        <Check size={16} aria-hidden="true" /> 대표
      </button>
      <button
        type="button"
        className={styles.remove}
        aria-label={removeLabel}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
      >
        <Trash2 size={18} aria-hidden="true" />
      </button>
    </>
  );
}
