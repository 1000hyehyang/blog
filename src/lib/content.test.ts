import { describe, expect, it } from "vitest";

import { createExcerpt } from "./content/excerpt";
import { formatDate, toBodyHeadingLevel, toSlug } from "./content";

describe("게시글 콘텐츠 유틸리티", () => {
  it("Markdown 문법을 제외한 요약을 생성한다", () => {
    expect(createExcerpt("## 제목\n[링크](https://example.com) **내용**")).toBe(
      "제목 링크 내용",
    );
  });

  it("카테고리 이름을 URL slug로 변환한다", () => {
    expect(toSlug("Web Development")).toBe("web-development");
  });

  it("본문 헤딩을 페이지 제목보다 한 단계 낮춰 렌더링한다", () => {
    expect(toBodyHeadingLevel(1)).toBe(2);
    expect(toBodyHeadingLevel(3)).toBe(4);
    expect(toBodyHeadingLevel(6)).toBe(6);
  });

  it("날짜를 Asia/Seoul 기준으로 표현한다", () => {
    expect(formatDate("2026-07-22T00:00:00Z", "en-US")).toBe("Jul 22, 2026");
    expect(formatDate("2026-07-22T15:00:00Z", "en-US")).toBe("Jul 23, 2026");
  });
});
