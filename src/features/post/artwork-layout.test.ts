import { describe, expect, it } from "vitest";

import { resolveArtworkAspectRatio } from "./artwork-layout";

describe("작품 갤러리 비율", () => {
  it("원본 크기가 있으면 원본 비율을 사용한다", () => {
    expect(resolveArtworkAspectRatio(1200, 1600)).toBe(3 / 4);
  });

  it("이미지를 읽기 전에는 안정적인 기본 비율을 사용한다", () => {
    expect(resolveArtworkAspectRatio()).toBe(4 / 5);
  });

  it("극단적인 세로·가로 이미지도 원본 비율을 유지한다", () => {
    expect(resolveArtworkAspectRatio(500, 2000)).toBe(1 / 4);
    expect(resolveArtworkAspectRatio(2400, 1000)).toBe(12 / 5);
  });
});
