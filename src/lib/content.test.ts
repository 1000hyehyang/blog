import { describe, expect, it } from "vitest";

import { createExcerpt, formatDate, parsePostBody, toSlug } from "./content";

describe("게시글 콘텐츠 유틸리티", () => {
  it("frontmatter를 본문에서 제거하고 메타데이터를 검증한다", () => {
    const result = parsePostBody(`---
excerpt: 테스트 요약
featured: true
featuredOrder: 2
tags: [Next.js, Web]
---
# 본문`);
    expect(result.body).toBe("# 본문");
    expect(result.metadata).toMatchObject({
      excerpt: "테스트 요약",
      featured: true,
      featuredOrder: 2,
      tags: ["Next.js", "Web"],
    });
    expect(result.valid).toBe(true);
  });

  it("잘못된 메타데이터를 안전한 기본값으로 대체한다", () => {
    const result = parsePostBody(`---
coverImage: not-a-url
tags: invalid
---
안전한 본문`);
    expect(result.valid).toBe(false);
    expect(result.body).toBe("안전한 본문");
    expect(result.metadata.tags).toEqual([]);
  });

  it("마크다운 문법을 제외한 요약을 생성한다", () => {
    expect(createExcerpt("## 제목\n[링크](https://example.com) **내용**")).toBe(
      "제목 링크 내용",
    );
  });

  it("카테고리 이름을 URL slug로 변환한다", () => {
    expect(toSlug("Web Development")).toBe("web-development");
  });

  it("날짜를 지정한 locale로 표현한다", () => {
    expect(formatDate("2026-07-22T00:00:00Z", "en-US")).toContain("2026");
  });
});
