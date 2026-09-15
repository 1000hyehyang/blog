import type { CSSProperties } from "react";
import styles from "./dither-loader.module.css";

export function DitherLoader({ label = "불러오는 중" }: { label?: string }) {
  return (
    <span className={styles.loader} role="status" aria-label={label}>
      {Array.from({ length: 16 }, (_, index) => (
        <i
          key={index}
          aria-hidden="true"
          style={
            { "--delay": `${((index * 7) % 16) * -80}ms` } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
