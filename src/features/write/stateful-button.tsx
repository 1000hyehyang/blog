"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, LoaderCircle, X } from "lucide-react";
import type { ComponentProps } from "react";
import styles from "./writer.module.css";

export type ButtonState = "idle" | "loading" | "success" | "error";

type Props = Omit<ComponentProps<typeof motion.button>, "children"> & {
  state: ButtonState;
  label: string;
  loadingLabel: string;
  successLabel: string;
  errorLabel?: string;
};

export function StatefulButton({
  state,
  label,
  loadingLabel,
  successLabel,
  errorLabel = "다시 시도",
  className,
  disabled,
  ...props
}: Props) {
  const reduced = useReducedMotion();
  const text =
    state === "loading"
      ? loadingLabel
      : state === "success"
        ? successLabel
        : state === "error"
          ? errorLabel
          : label;
  const Icon = state === "success" ? Check : state === "error" ? X : null;

  return (
    <motion.button
      {...props}
      layout="size"
      transition={{ layout: { duration: reduced ? 0 : 0.24 } }}
      className={`${styles.statefulButton} ${className ?? ""}`}
      data-state={state}
      aria-label={text}
      aria-busy={state === "loading"}
      disabled={disabled || state === "loading" || state === "success"}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={state === "idle" ? label : state}
          className={styles.buttonContent}
          aria-live="polite"
          initial={
            reduced ? { opacity: 0 } : { opacity: 0, y: 6, filter: "blur(5px)" }
          }
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={
            reduced
              ? { opacity: 0 }
              : { opacity: 0, y: -6, filter: "blur(5px)" }
          }
          transition={{ duration: reduced ? 0 : 0.16 }}
        >
          {state === "loading" && (
            <LoaderCircle
              size={16}
              className={styles.buttonSpinner}
              aria-hidden="true"
            />
          )}
          {Icon && <Icon size={16} aria-hidden="true" />}
          {text}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
