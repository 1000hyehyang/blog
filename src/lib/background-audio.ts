const FADE_DURATION_MS = 450;
const TARGET_VOLUME = 0.22;

type FadeOptions = {
  signal?: AbortSignal;
  duration?: number;
};

function clampVolume(value: number) {
  return Math.min(1, Math.max(0, value));
}

export async function fadeAudioVolume(
  audio: HTMLAudioElement,
  to: number,
  duration = FADE_DURATION_MS,
  options: FadeOptions = {},
) {
  const from = audio.volume;
  const target = clampVolume(to);
  const resolvedDuration = options.duration ?? duration;

  if (resolvedDuration <= 0 || options.signal?.aborted) {
    audio.volume = target;
    return;
  }

  await new Promise<void>((resolve) => {
    const start = performance.now();

    const step = (now: number) => {
      if (options.signal?.aborted) {
        resolve();
        return;
      }

      const progress = Math.min(1, (now - start) / resolvedDuration);
      audio.volume = from + (target - from) * progress;

      if (progress < 1) {
        requestAnimationFrame(step);
        return;
      }

      resolve();
    };

    requestAnimationFrame(step);
  });
}

export function createBackgroundAudio(src: string) {
  const audio = new Audio(src);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0;
  return audio;
}

export async function playBackgroundAudio(
  audio: HTMLAudioElement,
  options: FadeOptions = {},
) {
  if (options.signal?.aborted) return;

  if (audio.paused) {
    audio.currentTime = audio.currentTime || 0;
    await audio.play();
  }

  await fadeAudioVolume(
    audio,
    TARGET_VOLUME,
    options.duration ?? FADE_DURATION_MS,
    options,
  );
}

export async function pauseBackgroundAudio(
  audio: HTMLAudioElement,
  options: FadeOptions = {},
) {
  if (options.signal?.aborted) return;

  await fadeAudioVolume(audio, 0, options.duration ?? FADE_DURATION_MS, options);

  if (!options.signal?.aborted) {
    audio.pause();
  }
}

export { TARGET_VOLUME };
