import { describe, expect, it } from "vitest";

import {
  getMarkdownCodeLanguage,
  highlightMarkdownCode,
} from "./markdown-code";

describe("markdown code highlighting", () => {
  it("마크다운 클래스에서 Shiki 지원 언어를 찾는다", () => {
    expect(getMarkdownCodeLanguage("language-typescript")).toEqual({
      label: "typescript",
      shikiLanguage: "typescript",
    });
    expect(getMarkdownCodeLanguage("token language-js extra")).toEqual({
      label: "js",
      shikiLanguage: "js",
    });
  });

  it("일반 텍스트와 미지원 언어는 안전하게 기본 코드 블록으로 처리한다", () => {
    expect(getMarkdownCodeLanguage("language-text")).toEqual({
      label: "text",
      shikiLanguage: null,
    });
    expect(getMarkdownCodeLanguage("language-not-a-real-language")).toEqual({
      label: "not-a-real-language",
      shikiLanguage: null,
    });
  });

  it("언어별 토큰 색상을 생성하고 코드의 HTML을 이스케이프한다", async () => {
    const language = getMarkdownCodeLanguage("language-typescript");
    const html = await highlightMarkdownCode(
      'const content = "<script>alert(1)</script>";',
      language,
    );

    expect(html).toContain("--shiki-light");
    expect(html).toContain("--shiki-dark");
    expect(html).toContain("&#x3C;script>");
    expect(html).not.toContain("<script>");
  });
});
