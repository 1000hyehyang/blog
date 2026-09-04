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
  it("Discussion form의 본문과 설정을 파싱한다", () => {
    const result = parsePostBody(`### 포스트 본문

# Hello

### 본문 소제목

설명

---

### 대표 이미지

![cover](https://github.com/user-attachments/assets/cover-id)

### 갤러리 이미지

https://example.com/artwork.jpg

### 태그

Next.js, #React

### Featured

예

### Featured 순서

2

### 공개 상태

공개`);

    expect(result).toMatchObject({
      body: "# Hello\n\n### 본문 소제목\n\n설명",
      valid: true,
      metadata: {
        coverImage: "https://github.com/user-attachments/assets/cover-id",
        galleryImage: "https://example.com/artwork.jpg",
        featured: true,
        featuredOrder: 2,
        published: true,
        tags: ["Next.js", "React"],
      },
    });
  });

  it("비공개 상태와 비어 있는 응답을 처리한다", () => {
    const result = parsePostBody(`### 포스트 본문

작성 중인 글

### 대표 이미지

_No response_

### 태그

_No response_

### 공개 상태

비공개`);

    expect(result).toMatchObject({
      body: "작성 중인 글",
      valid: true,
      metadata: {
        coverImage: "",
        published: false,
        tags: [],
      },
    });
  });

  it("새 Form 형식이 아니면 공개하지 않는다", () => {
    const result = parsePostBody(`---
published: true
---
# 기존 글`);

    expect(result.valid).toBe(false);
    expect(result.body).toBe("");
    expect(result.metadata.published).toBe(false);
  });

  it("잘못된 Form 설정은 글을 공개하지 않는다", () => {
    const result = parsePostBody(`### 포스트 본문

본문 내용입니다.

### 대표 이미지

_No response_

### Featured 순서

first

### 공개 상태

공개`);

    expect(result.valid).toBe(false);
    expect(result.body).toBe("본문 내용입니다.");
    expect(result.metadata.published).toBe(false);
  });

  it("대표 이미지가 없거나 잘못되면 빈 값을 반환한다", () => {
    expect(resolveCoverImage()).toBe("");
    expect(resolveCoverImage("")).toBe("");
    expect(resolveCoverImage("not-a-url")).toBe("");
    expect(resolveCoverImage("https://example.com/cover.jpg")).toBe(
      "https://example.com/cover.jpg",
    );
  });

  it("마크다운 문법을 제외한 요약을 생성한다", () => {
    expect(createExcerpt("## 제목\n[링크](https://example.com) **내용**")).toBe(
      "제목 링크 내용",
    );
  });

  it("본문에서 요약을 생성한다", () => {
    const result = parsePostBody(`### 포스트 본문

## 실제 제목

내용입니다.

### 대표 이미지

https://example.com/cover.jpg

### 공개 상태

공개`);

    expect(result.metadata.excerpt).toBe("실제 제목 내용입니다.");
  });

  it("대표 이미지가 아닌 단독 URL은 본문에 유지한다", () => {
    const result = parsePostBody(`### 포스트 본문

# 참고 링크

https://example.com/docs

### 대표 이미지

_No response_

### 공개 상태

공개`);

    expect(result.body).toContain("https://example.com/docs");
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
