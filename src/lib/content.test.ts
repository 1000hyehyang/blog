import { describe, expect, it } from "vitest";

import { createExcerpt } from "./content/excerpt";
import {
  formatDate,
  parsePostBody,
  toBodyHeadingLevel,
  toSlug,
} from "./content";
import { resolveCoverImage } from "./content/metadata";

describe("포스트 콘텐츠 유틸리티", () => {
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

  it("coverImage가 비어 있어도 featured 값을 유지한다", () => {
    const result = parsePostBody(`---
coverImage:
featured: true
featuredOrder: 2
tags:
  - CS
---
# 본문`);
    expect(result.metadata.featured).toBe(true);
    expect(result.metadata.featuredOrder).toBe(2);
    expect(result.valid).toBe(true);
  });

  it("비어 있는 tags 필드를 빈 배열로 처리한다", () => {
    const result = parsePostBody(`---
published: true
tags:
---
# 본문`);

    expect(result.metadata.tags).toEqual([]);
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
    expect(result.metadata.coverImage).toBe("");
  });

  it("대표 이미지가 없거나 잘못되면 빈 값을 반환한다", () => {
    expect(resolveCoverImage()).toBe("");
    expect(resolveCoverImage("")).toBe("");
    expect(resolveCoverImage("not-a-url")).toBe("");
    expect(resolveCoverImage("https://example.com/cover.jpg")).toBe(
      "https://example.com/cover.jpg",
    );
  });

  it("parses a separate gallery image URL", () => {
    const result = parsePostBody(`---
coverImage: https://example.com/thumbnail.jpg
galleryImage: https://example.com/artwork.jpg
published: true
---
# Artwork`);

    expect(result.metadata.coverImage).toBe(
      "https://example.com/thumbnail.jpg",
    );
    expect(result.metadata.galleryImage).toBe(
      "https://example.com/artwork.jpg",
    );
    expect(result.body).toBe("# Artwork");
  });

  it("마크다운 문법을 제외한 요약을 생성한다", () => {
    expect(createExcerpt("## 제목\n[링크](https://example.com) **내용**")).toBe(
      "제목 링크 내용",
    );
  });

  it("GitHub Discussion form 헤더 뒤 frontmatter를 파싱한다", () => {
    const result = parsePostBody(`### 포스트 본문

---
published: true
tags: [Development]
---

# Hello`);
    expect(result.metadata.published).toBe(true);
    expect(result.body).toBe("# Hello");
  });

  it("카테고리 이름을 URL slug로 변환한다", () => {
    expect(toSlug("Web Development")).toBe("web-development");
  });

  it("본문 헤딩을 페이지 제목보다 한 단계 낮춰 렌더링한다", () => {
    expect(toBodyHeadingLevel(1)).toBe(2);
    expect(toBodyHeadingLevel(3)).toBe(4);
    expect(toBodyHeadingLevel(6)).toBe(6);
  });

  it("excerpt에 URL만 있으면 본문에서 요약을 생성한다", () => {
    const url = "https://example.com/cover.jpg";
    const result = parsePostBody(`---
excerpt: ${url}
coverImage: ${url}
featured: true
---
## 실제 제목

내용입니다.`);

    expect(result.metadata.excerpt).toBe("실제 제목 내용입니다.");
  });

  it("대표 이미지가 아닌 단독 URL은 본문에 유지한다", () => {
    const result = parsePostBody(`---
published: true
---
# 참고 링크

https://example.com/docs`);

    expect(result.body).toContain("https://example.com/docs");
  });

  it("손상된 frontmatter는 본문을 보존하고 안전한 기본값을 사용한다", () => {
    const result = parsePostBody(`### 포스트 본문

---
coverImage:https://example.com/cover.jpg
featured: false
---

## 실제 제목

본문 내용입니다.`);

    expect(result.valid).toBe(false);
    expect(result.body).toBe("## 실제 제목\n\n본문 내용입니다.");
    expect(result.metadata.coverImage).toBe("");
    expect(result.metadata.featured).toBe(false);
    expect(result.metadata.tags).toEqual([]);
  });

  it("날짜를 Asia/Seoul 기준으로 표현한다", () => {
    // UTC 자정은 한국 시간으로 같은 날 오전 9시
    expect(formatDate("2026-07-22T00:00:00Z", "en-US")).toBe("Jul 22, 2026");
    // UTC 15:00은 한국 시간으로 다음날 자정
    expect(formatDate("2026-07-22T15:00:00Z", "en-US")).toBe("Jul 23, 2026");
  });
});
