import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createBackgroundAudio,
  fadeAudioVolume,
  pauseBackgroundAudio,
  playBackgroundAudio,
} from "./background-audio";

const TARGET_VOLUME = 0.22;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("background-audio", () => {
  it("배경음악을 반복 재생하되 미리 로드하지 않는다", () => {
    const audio = createBackgroundAudio("/voluntates-fati.mp3");
    expect(audio.loop).toBe(true);
    expect(audio.preload).toBe("none");
    expect(audio.volume).toBe(0);
  });

  it("페이드 시간이 0이면 볼륨을 즉시 변경한다", async () => {
    const audio = { volume: 0 } as HTMLAudioElement;

    await fadeAudioVolume(audio, TARGET_VOLUME, { duration: 0 });

    expect(audio.volume).toBe(TARGET_VOLUME);
  });

  it("페이드 중 볼륨이 0~1 범위를 벗어나지 않는다", async () => {
    let frameTime = 0;
    vi.spyOn(performance, "now").mockReturnValue(0);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frameTime += 50;
      queueMicrotask(() => callback(frameTime));
      return frameTime;
    });

    const volumes: number[] = [];
    const audio = {
      get volume() {
        return volumes.at(-1) ?? 0;
      },
      set volume(value: number) {
        volumes.push(value);
      },
    } as HTMLAudioElement;

    await fadeAudioVolume(audio, 2, { duration: 450 });

    expect(volumes[0]).toBeGreaterThan(0);
    expect(volumes[0]).toBeLessThan(1);
    expect(volumes.every((value) => value >= 0 && value <= 1)).toBe(true);
    expect(audio.volume).toBe(1);
  });

  it("재생과 일시 정지에 페이드 옵션을 전달하고 취소된 요청은 무시한다", async () => {
    const audio = {
      volume: 0,
      currentTime: 12,
      paused: true,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
    } as unknown as HTMLAudioElement;

    await playBackgroundAudio(audio, { duration: 0 });
    expect(audio.play).toHaveBeenCalledOnce();
    expect(audio.volume).toBe(TARGET_VOLUME);
    expect(audio.currentTime).toBe(12);

    const signal = AbortSignal.abort();
    await pauseBackgroundAudio(audio, { duration: 0, signal });
    await playBackgroundAudio(audio, { duration: 0, signal });
    expect(audio.pause).not.toHaveBeenCalled();
    expect(audio.play).toHaveBeenCalledOnce();
    expect(audio.volume).toBe(TARGET_VOLUME);

    await pauseBackgroundAudio(audio, { duration: 0 });
    expect(audio.pause).toHaveBeenCalledOnce();
    expect(audio.volume).toBe(0);
  });
});
