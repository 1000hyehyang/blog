import { describe, expect, it } from "vitest";

import { getStandaloneExternalUrl } from "./markdown-link";

function paragraphWithLink(href: string, text = href) {
  return {
    type: "element",
    tagName: "p",
    properties: {},
    children: [
      {
        type: "element",
        tagName: "a",
        properties: { href },
        children: [{ type: "text", value: text }],
      },
    ],
  };
}

describe("getStandaloneExternalUrl", () => {
  it("단독 bare HTTP URL을 북마크 대상으로 판별한다", () => {
    expect(
      getStandaloneExternalUrl(paragraphWithLink("https://example.com")),
    ).toBe("https://example.com/");
  });

  it("라벨 링크와 내부·위험 URL은 북마크 대상으로 판별하지 않는다", () => {
    expect(
      getStandaloneExternalUrl(
        paragraphWithLink("https://example.com", "Example 사이트"),
      ),
    ).toBeNull();
    expect(
      getStandaloneExternalUrl(paragraphWithLink("/posts", "/posts")),
    ).toBeNull();
    expect(
      getStandaloneExternalUrl(
        paragraphWithLink("javascript:alert(1)", "javascript:alert(1)"),
      ),
    ).toBeNull();
  });

  it("문장 안 링크나 여러 링크는 북마크 대상으로 판별하지 않는다", () => {
    const node = paragraphWithLink("https://example.com");
    node.children.unshift({
      type: "text",
      tagName: "",
      properties: { href: "" },
      children: [{ type: "text", value: "문장 안 " }],
    });

    expect(getStandaloneExternalUrl(node)).toBeNull();
  });
});
