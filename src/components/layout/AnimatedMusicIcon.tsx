"use client";

import { motion } from "framer-motion";
import { HeadphoneOff, Headphones } from "lucide-react";

type AnimatedMusicIconProps = {
  showSound: boolean;
  reduceMotion: boolean;
};

const ICON_TRANSITION_DURATION = 0.35;

export function AnimatedMusicIcon({
  showSound,
  reduceMotion,
}: AnimatedMusicIconProps) {
  const transition = {
    duration: reduceMotion ? 0 : ICON_TRANSITION_DURATION,
    ease: "easeInOut" as const,
  };

  return (
    <span className="relative inline-grid size-5 place-items-center">
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 grid place-items-center"
        initial={false}
        animate={{
          opacity: showSound ? 0 : 1,
          rotate: showSound ? -100 : 0,
          scale: showSound ? 0.5 : 1,
        }}
        transition={transition}
        style={{ transformOrigin: "50% 50%" }}
      >
        <HeadphoneOff className="size-5" strokeWidth={1.75} />
      </motion.span>
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 grid place-items-center"
        initial={false}
        animate={{
          opacity: showSound ? 1 : 0,
          rotate: showSound ? 0 : 100,
          scale: showSound ? 1 : 0.5,
        }}
        transition={transition}
        style={{ transformOrigin: "50% 50%" }}
      >
        <Headphones className="size-5" strokeWidth={1.75} />
      </motion.span>
    </span>
  );
}
