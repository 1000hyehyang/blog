"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useReducedMotion } from "framer-motion";

import { AnimatedMusicIcon } from "@/components/layout/animated-music-icon";
import { getBackgroundMusicSrc } from "@/config/background-music";
import {
  createBackgroundAudio,
  pauseBackgroundAudio,
  playBackgroundAudio,
} from "@/lib/background-audio";

const STORAGE_KEY = "blog-music-enabled";

function readStoredPreference() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

export function useMusicToggle() {
  const shouldReduceMotion = Boolean(useReducedMotion());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeAbortRef = useRef<AbortController | null>(null);
  const wasPlayingBeforeHideRef = useRef(false);
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [isPlaying, setIsPlaying] = useState(readStoredPreference);

  useEffect(() => {
    if (!isMounted) return;

    const musicSrc = getBackgroundMusicSrc();
    if (!musicSrc) return;

    if (!audioRef.current) {
      audioRef.current = createBackgroundAudio(musicSrc);
    }

    return () => {
      fadeAbortRef.current?.abort();
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted) return;

    window.localStorage.setItem(STORAGE_KEY, String(isPlaying));

    const audio = audioRef.current;
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

  useEffect(() => {
    if (!isMounted) return;

    const handleVisibilityChange = () => {
      const audio = audioRef.current;
      if (!audio) return;

      if (document.hidden) {
        wasPlayingBeforeHideRef.current = isPlaying && !audio.paused;
        if (wasPlayingBeforeHideRef.current) {
          fadeAbortRef.current?.abort();
          audio.pause();
        }
        return;
      }

      if (wasPlayingBeforeHideRef.current && isPlaying) {
        wasPlayingBeforeHideRef.current = false;
        void playBackgroundAudio(audio).catch(() => {
          setIsPlaying(false);
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isMounted, isPlaying]);

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
      className="grid size-9 cursor-pointer place-items-center rounded-full bg-muted text-foreground transition-colors hover:text-secondary focus-visible:outline-none"
      onClick={toggleMusic}
    >
      <AnimatedMusicIcon
        showSound={isPlaying}
        reduceMotion={shouldReduceMotion}
      />
    </button>
  );
}
