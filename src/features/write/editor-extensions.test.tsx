import { Editor } from "@tiptap/react";
import { readFile, readdir } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { describe, expect, it } from "vitest";
import { parsePostFile } from "@/lib/content/post-file";
import { editorExtensions, hasUnsupportedHtml } from "./editor-extensions";

function rendered(source: string) {
  const div = document.createElement("div");
  div.innerHTML = renderToStaticMarkup(
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>,
  );
  return div;
}
describe("Tiptap Markdown preservation", () => {
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
    for (const name of await readdir("content/posts")) {
      if (!name.endsWith(".md")) continue;
      const { body } = parsePostFile(
        await readFile(`content/posts/${name}`, "utf8"),
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
