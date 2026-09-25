import { Editor } from "@tiptap/react";
import { readFile, readdir } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { describe, expect, it, vi } from "vitest";
import { parsePostFile } from "@/lib/content/post-file";
import { MarkdownContent } from "@/components/markdown";
import { editorExtensions, hasUnsupportedHtml } from "./editor-extensions";

vi.mock("server-only", () => ({}));

function rendered(source: string) {
  const div = document.createElement("div");
  div.innerHTML = renderToStaticMarkup(
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>,
  );
  return div;
}
describe("Tiptap Markdown preservation", () => {
  it("edits table dimensions without losing cells or Markdown", () => {
    const editor = new Editor({
      extensions: editorExtensions(),
      content: "앞 문단\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n뒤 문단",
      contentType: "markdown",
    });
    const firstParagraph = editor.state.doc.firstChild!;
    editor.commands.setTextSelection(firstParagraph.nodeSize + 4);
    expect(editor.state.doc.child(1).childCount).toBe(2);
    expect(editor.commands.addRowAfter()).toBe(true);
    expect(editor.commands.addColumnAfter()).toBe(true);
    expect(editor.state.doc.child(1).childCount).toBe(3);
    expect(editor.state.doc.child(1).firstChild?.childCount).toBe(3);
    const tablePosition = firstParagraph.nodeSize;
    const expanded = editor.state.doc.child(1);
    const addedRowPosition = tablePosition + 1 + expanded.child(0).nodeSize;
    editor.commands.setTextSelection(addedRowPosition + 3);
    expect(editor.commands.deleteRow()).toBe(true);
    const firstRow = editor.state.doc.child(1).firstChild!;
    editor.commands.setTextSelection(
      tablePosition + 4 + firstRow.child(0).nodeSize,
    );
    expect(editor.commands.deleteColumn()).toBe(true);
    expect(editor.state.doc.child(1).childCount).toBe(2);
    expect(editor.state.doc.child(1).firstChild?.childCount).toBe(2);
    expect(editor.state.doc.firstChild?.textContent).toBe("앞 문단");
    const saved = editor.getMarkdown();
    expect(saved).toContain("| 1");
    expect(saved).toContain("2");
    expect(editor.commands.undo()).toBe(true);
    expect(editor.getMarkdown()).not.toBe(saved);
    expect(editor.commands.redo()).toBe(true);
    expect(editor.getMarkdown()).toBe(saved);
    editor.commands.setContent(saved, { contentType: "markdown" });
    expect(editor.state.doc.child(1).type.name).toBe("table");
    expect(editor.state.doc.child(1).childCount).toBe(2);
    expect(editor.state.doc.child(1).firstChild?.childCount).toBe(2);
    editor.destroy();
  });
  it("keeps image alignment, size and caption after saving and reopening", () => {
    const editor = new Editor({
      extensions: editorExtensions(),
      content: '![설명](https://example.com/image.png "기존 제목")',
      contentType: "markdown",
    });
    const original = editor.getMarkdown();
    expect(original).toContain('"기존 제목"');
    const image = editor.state.doc.firstChild!;
    expect(image.type.name).toBe("image");
    editor.commands.setNodeSelection(0);
    editor.commands.updateAttributes("image", {
      align: "right",
      width: 65,
      caption: '캡션 "한글"',
    });
    const saved = editor.getMarkdown();
    expect(saved).toContain("blog-image:v1:");
    editor.commands.setContent(saved, { contentType: "markdown" });
    expect(editor.state.doc.firstChild?.attrs).toMatchObject({
      align: "right",
      width: 65,
      caption: '캡션 "한글"',
      title: "기존 제목",
    });
    const publicView = document.createElement("div");
    publicView.innerHTML = renderToStaticMarkup(
      <MarkdownContent source={saved} />,
    );
    expect(publicView.querySelector(".markdown-image-frame")).toHaveAttribute(
      "data-align",
      "right",
    );
    expect(publicView.querySelector(".markdown-image-frame")).toHaveStyle({
      width: "65%",
    });
    expect(
      publicView.querySelector(".markdown-image-caption"),
    ).toHaveTextContent('캡션 "한글"');
    editor.commands.setNodeSelection(0);
    editor.commands.updateAttributes("image", {
      align: "center",
      width: 100,
      caption: "",
    });
    expect(editor.getMarkdown().trim()).toBe(original.trim());
    editor.destroy();
  });
  it("round-trips formatting, images, lists, tables and code", () => {
    const source =
      "# 제목\n\n**굵게** *기울임* ~~취소~~ [링크](https://example.com)\n\n![설명](https://example.com/image.png)\n\n- [x] 완료\n- [ ] 대기\n\n> 인용\n\n```ts\nconst a = '<text>';\n```\n\n| A | B |\n| - | - |\n| C | D |";
    const editor = new Editor({
      extensions: editorExtensions(),
      content: source,
      contentType: "markdown",
    });
    const output = editor.getMarkdown();
    expect(output).toContain("https://example.com/image.png");
    expect(output).toContain("- [x] 완료");
    expect(output).toContain("```ts");
    expect(rendered(output).querySelectorAll("table")).toHaveLength(1);
    editor.commands.setContent(output, { contentType: "markdown" });
    expect(rendered(editor.getMarkdown()).textContent).toBe(
      rendered(output).textContent,
    );
    editor.destroy();
  });
  it("preserves migrated articles' visible text, code and links through visual editing", async () => {
    for (const name of await readdir("tests/fixtures/posts")) {
      if (!name.endsWith(".md")) continue;
      const { body } = parsePostFile(
        await readFile(`tests/fixtures/posts/${name}`, "utf8"),
        name.slice(0, -3),
      );
      expect(hasUnsupportedHtml(body), name).toBe(false);
      const editor = new Editor({
        extensions: editorExtensions(),
        content: body,
        contentType: "markdown",
      });
      const before = rendered(body);
      const after = rendered(editor.getMarkdown());
      const a = after.textContent!.replace(/\s/g, "");
      const b = before.textContent!.replace(/\s/g, "");
      const mismatch = [...a].findIndex((_, i) => a[i] !== b[i]);
      expect(
        a.slice(Math.max(0, mismatch - 50), mismatch + 120),
        `${name}: offset ${mismatch}; lengths ${a.length}/${b.length}`,
      ).toBe(b.slice(Math.max(0, mismatch - 50), mismatch + 120));
      expect(a.length, name).toBe(b.length);
      for (const selector of ["pre code", "img", "a"]) {
        const values = (div: HTMLElement) =>
          Array.from(div.querySelectorAll(selector)).map((el) =>
            selector === "img"
              ? el.getAttribute("src")
              : selector === "a"
                ? el.getAttribute("href")
                : el.textContent,
          );
        expect(values(after), `${name}: ${selector}`).toEqual(values(before));
      }
      editor.destroy();
    }
  });
  it("detects unsupported raw HTML without blocking code examples", () => {
    expect(
      hasUnsupportedHtml("<iframe src='https://example.com'></iframe>"),
    ).toBe(true);
    expect(
      hasUnsupportedHtml("```java\nList<String> list;\n```\n\n`<tag>`"),
    ).toBe(false);
  });
});
