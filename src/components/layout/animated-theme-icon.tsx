"use client";

import { useId } from "react";
import { motion } from "framer-motion";

type AnimatedThemeIconProps = {
  showMoon: boolean;
  reduceMotion: boolean;
};

const ICON_TRANSITION_DURATION = 0.35;

export function AnimatedThemeIcon({
  showMoon,
  reduceMotion,
}: AnimatedThemeIconProps) {
  const clipPathId = `theme-toggle-icon-${useId().replace(/:/g, "")}`;
  const transition = {
    duration: reduceMotion ? 0 : ICON_TRANSITION_DURATION,
    ease: "easeInOut" as const,
  };

  return (
    <motion.svg
      initial={false}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      fill="currentColor"
      strokeLinecap="round"
      viewBox="0 0 32 32"
      className="size-5"
    >
      <clipPath id={clipPathId}>
        <motion.path
          animate={{ x: showMoon ? -12 : 0, y: showMoon ? 10 : 0 }}
          transition={transition}
          d="M0-5h30a1 1 0 0 0 9 13v24H0Z"
        />
      </clipPath>
      <g clipPath={`url(#${clipPathId})`}>
        <motion.circle
          animate={{ r: showMoon ? 10 : 8 }}
          transition={transition}
          cx="16"
          cy="16"
        />
        <motion.g
          animate={{
            rotate: showMoon ? -100 : 0,
            scale: showMoon ? 0.5 : 1,
            opacity: showMoon ? 0 : 1,
          }}
          transition={transition}
          stroke="currentColor"
          strokeWidth="1.5"
          style={{ transformOrigin: "16px 16px" }}
        >
          <path d="M16 5.5v-4" />
          <path d="M16 30.5v-4" />
          <path d="M1.5 16h4" />
          <path d="M26.5 16h4" />
          <path d="m23.4 8.6 2.8-2.8" />
          <path d="m5.7 26.3 2.9-2.9" />
          <path d="m5.8 5.8 2.8 2.8" />
          <path d="m23.4 23.4 2.9 2.9" />
        </motion.g>
      </g>
    </motion.svg>
  );
}
