import { describe, expect, it } from "vitest";

import {
  createBackgroundAudio,
  fadeAudioVolume,
  TARGET_VOLUME,
} from "./background-audio";

describe("background-audio", () => {
  it("배경음악 오디오를 미리 로드하도록 생성한다", () => {
    const audio = createBackgroundAudio("/Memento%20mori.mp3");
    expect(audio.loop).toBe(true);
    expect(audio.preload).toBe("auto");
    expect(audio.volume).toBe(0);
  });

  it("볼륨을 점진적으로 변경한다", async () => {
    const audio = { volume: 0 } as HTMLAudioElement;

    await fadeAudioVolume(audio, TARGET_VOLUME, 0);

    expect(audio.volume).toBe(TARGET_VOLUME);
  });
});
