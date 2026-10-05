import { cleanup, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MarkdownContent } from "./markdown";
import { toSlug } from "@/lib/content";
import { extractHeadings } from "@/lib/content/headings";
import { getReactNodeText } from "@/lib/react/get-node-text";

vi.mock("server-only", () => ({}));

afterEach(() => cleanup());

describe("MarkdownContent headings", () => {
  it("ignores fenced code and shares unique IDs for entities, nested and Setext headings", () => {
    expect(extractHeadings("~~~md\n# fake\n~~~")).toEqual([]);
    const source =
      "## Repeat\n\n## Repeat\n\n## Repeat-2\n\n## A &amp; B\n\nTitle\n=====\n\n> ## ++Nested++\n\n## !!!";
    const headings = extractHeadings(source);
    expect(headings.map(({ id }) => id)).toEqual([
      "repeat",
      "repeat-2",
      "repeat-2-2",
      "a-b",
      "title",
      "nested",
      "section",
    ]);
    const { container } = render(<MarkdownContent source={source} />);
    expect(
      Array.from(
        container.querySelectorAll(".markdown-heading"),
        (node) => node.id,
      ),
    ).toEqual(headings.map(({ id }) => id));
    expect(headings[3].text).toBe("A & B");
  });
  it("keeps headings inside tight lists out of paragraph wrappers", () => {
    const html = renderToStaticMarkup(
      <MarkdownContent
        source={"- 앞 문단\n  ## 첫 제목\n- 다음 문단\n  ### 다음 제목"}
      />,
    );

    expect(html).toMatch(/<p>앞 문단\s*<\/p>\s*<h3/);
    expect(html).toMatch(/<p>다음 문단\s*<\/p>\s*<h4/);
    expect(html).not.toMatch(/<p>[^<]*<h[1-6]\b/);
  });

  it("preserves the Markdown heading level for visual styling", () => {
    const { container } = render(
      <MarkdownContent
        source={"# Heading 1\n\n## Heading 2\n\n### Heading 3"}
      />,
    );

    expect(container.querySelector("h2.markdown-heading--1")).toHaveTextContent(
      "Heading 1",
    );
    expect(container.querySelector("h3.markdown-heading--2")).toHaveTextContent(
      "Heading 2",
    );
    expect(container.querySelector("h4.markdown-heading--3")).toHaveTextContent(
      "Heading 3",
    );
  });

  it("uses the same id as the table of contents for formatted headings", () => {
    const codeHeading = extractHeadings("## `@Cacheable`은 항상 동작할까?")[0];
    const renderedCodeHeadingText = getReactNodeText(
      <>
        <code>@Cacheable</code>은 항상 동작할까?
      </>,
    );

    expect(codeHeading).toEqual({
      id: "cacheable은-항상-동작할까",
      level: 2,
      text: "@Cacheable은 항상 동작할까?",
    });
    expect(toSlug(renderedCodeHeadingText)).toBe(codeHeading.id);

    const source = "### [React](https://react.dev) 렌더링";
    const headings = extractHeadings(source);
    const { container } = render(<MarkdownContent source={source} />);

    expect(headings).toEqual([
      {
        id: "react-렌더링",
        level: 3,
        text: "React 렌더링",
      },
    ]);

    for (const heading of headings) {
      expect(document.getElementById(heading.id)).toBeInTheDocument();
    }
    expect(container.querySelectorAll(".markdown-heading")).toHaveLength(1);
  });
});
