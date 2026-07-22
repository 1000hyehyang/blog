import { describe, expect, it } from "vitest";

import {
  createBackgroundAudio,
  fadeAudioVolume,
} from "./background-audio";

const TARGET_VOLUME = 0.22;

describe("background-audio", () => {
  it("배경음악 오디오를 미리 로드하도록 생성한다", () => {
    const audio = createBackgroundAudio("/voluntates-fati.mp3");
    expect(audio.loop).toBe(true);
    expect(audio.preload).toBe("auto");
    expect(audio.volume).toBe(0);
  });

  it("볼륨을 점진적으로 변경한다", async () => {
    const audio = { volume: 0 } as HTMLAudioElement;

    await fadeAudioVolume(audio, TARGET_VOLUME, 0);

    expect(audio.volume).toBe(TARGET_VOLUME);
  });

  it("페이드 중 볼륨이 0~1 범위를 벗어나지 않는다", async () => {
    const volumes: number[] = [];
    const audio = {
      get volume() {
        return volumes.at(-1) ?? 0;
      },
      set volume(value: number) {
        volumes.push(value);
      },
    } as HTMLAudioElement;

    await fadeAudioVolume(audio, 0, 450);

    expect(volumes.every((value) => value >= 0 && value <= 1)).toBe(true);
    expect(audio.volume).toBe(0);
  });
});
