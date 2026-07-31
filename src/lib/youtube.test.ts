import { describe, expect, it } from "vitest";

import { buildYouTubeEmbedUrl, parseYouTubeUrl } from "./youtube";

const VIDEO_ID = "s_91Rtt1iqU";

describe("parseYouTubeUrl", () => {
  it.each([
    `https://youtu.be/${VIDEO_ID}?si=tracking-token`,
    `https://www.youtube.com/watch?v=${VIDEO_ID}&feature=share`,
    `https://m.youtube.com/watch?v=${VIDEO_ID}`,
    `https://www.youtube.com/shorts/${VIDEO_ID}`,
    `https://www.youtube.com/live/${VIDEO_ID}`,
    `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`,
  ])("지원하는 YouTube URL에서 영상 ID를 추출한다: %s", (url) => {
    expect(parseYouTubeUrl(url)).toEqual({ id: VIDEO_ID });
  });

  it.each([
    "https://youtube.com.evil.example/watch?v=s_91Rtt1iqU",
    "http://youtu.be/s_91Rtt1iqU",
    "https://www.youtube.com/watch?v=too-short",
    "https://www.youtube.com/playlist?list=example",
    "javascript:alert(1)",
    "/watch?v=s_91Rtt1iqU",
  ])("지원하지 않거나 위험한 URL을 거부한다: %s", (url) => {
    expect(parseYouTubeUrl(url)).toBeNull();
  });
});

describe("YouTube embed URL 생성", () => {
  it("검증된 영상 ID로 privacy-enhanced iframe URL을 만든다", () => {
    expect(buildYouTubeEmbedUrl(VIDEO_ID)).toBe(
      `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?rel=0`,
    );
  });

  it("유효하지 않은 영상 ID로 URL을 만들지 않는다", () => {
    expect(buildYouTubeEmbedUrl("../private")).toBeNull();
  });
});
