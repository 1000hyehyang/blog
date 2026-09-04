"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AnimatedMusicIcon } from "@/components/layout/animated-music-icon";
import { backgroundMusicSrc } from "@/config/background-music";
import {
  createBackgroundAudio,
  pauseBackgroundAudio,
  playBackgroundAudio,
} from "@/lib/background-audio";
import { useHydrated } from "@/lib/react/use-hydrated";
import { usePrefersReducedMotion } from "@/lib/react/use-prefers-reduced-motion";

const STORAGE_KEY = "blog-music-enabled";

function readStoredPreference() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

function useMusicToggle() {
  const shouldReduceMotion = usePrefersReducedMotion();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeAbortRef = useRef<AbortController | null>(null);
  const isMounted = useHydrated();
  const [isPlaying, setIsPlaying] = useState(readStoredPreference);

  useEffect(() => {
    if (!isMounted) return;

    return () => {
      fadeAbortRef.current?.abort();
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted) return;

    window.localStorage.setItem(STORAGE_KEY, String(isPlaying));

    const audio =
      audioRef.current ??
      (isPlaying
        ? (audioRef.current = createBackgroundAudio(backgroundMusicSrc))
        : null);
    if (!audio) return;

    fadeAbortRef.current?.abort();
    const controller = new AbortController();
    fadeAbortRef.current = controller;
    const fadeDuration = shouldReduceMotion ? 0 : undefined;

    const run = async () => {
      try {
        if (isPlaying) {
          await playBackgroundAudio(audio, {
            signal: controller.signal,
            duration: fadeDuration,
          });
        } else {
          await pauseBackgroundAudio(audio, {
            signal: controller.signal,
            duration: fadeDuration,
          });
        }
      } catch {
        if (!controller.signal.aborted && isPlaying) {
          setIsPlaying(false);
        }
      }
    };

    void run();

    return () => {
      controller.abort();
    };
  }, [isMounted, isPlaying, shouldReduceMotion]);

  const toggleMusic = useCallback(() => {
    setIsPlaying((value) => !value);
  }, []);

  return {
    isMounted,
    isPlaying,
    shouldReduceMotion,
    toggleMusic,
  };
}

export function MusicToggle() {
  const { isMounted, isPlaying, shouldReduceMotion, toggleMusic } =
    useMusicToggle();

  if (!isMounted) {
    return <span aria-hidden="true" className="inline-block size-9" />;
  }

  return (
    <button
      type="button"
      aria-label={isPlaying ? "음악 끄기" : "음악 켜기"}
      aria-pressed={isPlaying}
      className="grid size-9 cursor-pointer place-items-center rounded-full bg-muted text-foreground transition-colors hover:text-secondary"
      onClick={toggleMusic}
    >
      <AnimatedMusicIcon
        showSound={isPlaying}
        reduceMotion={shouldReduceMotion}
      />
    </button>
  );
}
