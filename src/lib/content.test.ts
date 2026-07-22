import { describe, expect, it } from "vitest";

import { createExcerpt } from "./content/excerpt";
import { formatDate, parsePostBody, toSlug } from "./content";
import { resolveCoverImage } from "./content/metadata";

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

  it("coverImage가 비어 있어도 featured 값을 유지한다", () => {
    const result = parsePostBody(`---
slug:
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

  it("마크다운 문법을 제외한 요약을 생성한다", () => {
    expect(createExcerpt("## 제목\n[링크](https://example.com) **내용**")).toBe(
      "제목 링크 내용",
    );
  });

  it("GitHub Discussion form 헤더 뒤 frontmatter를 파싱한다", () => {
    const result = parsePostBody(`### 게시글 본문

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

  it("Discussion 템플릿 placeholder를 본문과 요약에서 제거한다", () => {
    const result = parsePostBody(`---
published: true
---
## 제목

CS 개념과 정리를 작성하세요.

## 실제 섹션

내용입니다.`);
    expect(result.body).toBe("## 실제 섹션\n\n내용입니다.");
    expect(result.metadata.excerpt).toBe("실제 섹션 내용입니다.");
  });

  it("본문에 남은 coverImage URL은 요약에서 제외한다", () => {
    const url =
      "https://i.pinimg.com/736x/46/e5/34/46e534d7e420371b1ef45b4b3d669cc7.jpg";
    const result = parsePostBody(`---
slug:
excerpt:
coverImage: ${url}
featured: true
---
${url}

## 실제 제목

본문 내용입니다.`);

    expect(result.body).toBe("## 실제 제목\n\n본문 내용입니다.");
    expect(result.metadata.excerpt).toBe("실제 제목 본문 내용입니다.");
    expect(result.metadata.excerpt).not.toContain("pinimg.com");
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

  it("GitHub에서 줄바꿈이 깨진 frontmatter를 본문에서 제거한다", () => {
    const result = parsePostBody(`slug: excerpt: coverImage:https://i.pinimg.com/736x/46/e5/34/46e534d7e420371b1ef45b4b3d669cc7.jpg featured: true featuredOrder: 2 published: true tags:

Development

## 실제 제목

본문 내용입니다.`);

    expect(result.body).toBe("## 실제 제목\n\n본문 내용입니다.");
    expect(result.metadata.featured).toBe(true);
    expect(result.metadata.featuredOrder).toBe(2);
    expect(result.metadata.coverImage).toBe(
      "https://i.pinimg.com/736x/46/e5/34/46e534d7e420371b1ef45b4b3d669cc7.jpg",
    );
    expect(result.metadata.tags).toEqual(["Development"]);
  });

  it("날짜를 지정한 locale로 표현한다", () => {
    expect(formatDate("2026-07-22T00:00:00Z", "en-US")).toContain("2026");
  });
});
