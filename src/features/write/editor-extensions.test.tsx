import { Editor } from "@tiptap/react";
import { readFile, readdir } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { parsePostFile } from "@/lib/content/post-file";
import { MarkdownContent } from "@/components/markdown";
import { remarkUnderline } from "@/lib/markdown-underline";
import { editorExtensions, hasUnsupportedHtml } from "./editor-extensions";
import { nextCoverImageSrc } from "./image-editor";
import { readImageGroup } from "@/lib/image-group";

vi.mock("server-only", () => ({}));

function rendered(source: string) {
  const div = document.createElement("div");
  div.innerHTML = renderToStaticMarkup(
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>,
  );
  return div;
}
describe("Tiptap Markdown preservation", () => {
  it("saves underlines and renders them in posts", () => {
    const editor = new Editor({
      extensions: editorExtensions(),
      content: "밑줄",
      contentType: "markdown",
    });
    editor.commands.setTextSelection({ from: 1, to: 3 });
    editor.commands.toggleUnderline();
    const source = editor.getMarkdown();
    expect(source).toContain("++밑줄++");
    expect(renderToStaticMarkup(<MarkdownContent source={source} />)).toContain(
      "<u>밑줄</u>",
    );
    editor.commands.setContent(source, { contentType: "markdown" });
    expect(editor.getHTML()).toContain("<u>밑줄</u>");
    expect(
      renderToStaticMarkup(<MarkdownContent source="++**강조**++" />),
    ).toContain("<u><strong>강조</strong></u>");
    const literal = renderToStaticMarkup(
      <MarkdownContent source={"\\+\\+그대로\\+\\+"} />,
    );
    expect(literal).not.toContain("<u>");
    expect(literal).toContain("++그대로++");
    expect(
      renderToStaticMarkup(<MarkdownContent source="C++ and C++" />),
    ).toContain("C++ and C++");
    expect(
      renderToStaticMarkup(
        <ReactMarkdown remarkPlugins={[remarkUnderline]}>
          {"`++code++`"}
        </ReactMarkdown>,
      ),
    ).toContain("<code>++code++</code>");
    editor.destroy();
  });
  it("highlights editable code without changing saved Markdown", async () => {
    const source = "```ts\nconst value = 1;\nconst next = 2;\n```";
    const editor = new Editor({
      extensions: editorExtensions(),
      content: source,
      contentType: "markdown",
    });

    await waitFor(() =>
      expect(
        editor.view.dom.querySelectorAll(".writer-code-token").length,
      ).toBeGreaterThan(0),
    );
    expect(
      editor.view.dom
        .querySelector(".writer-code-token")
        ?.getAttribute("style"),
    ).toContain("--shiki-dark:");
    expect(editor.view.dom.querySelector("pre code")?.textContent).toBe(
      "const value = 1;\nconst next = 2;",
    );
    expect(editor.getMarkdown()).toContain(source);

    editor.commands.setTextSelection(5);
    editor.commands.insertContent("x");
    await waitFor(() =>
      expect(editor.view.dom.querySelector("pre code")?.textContent).toContain(
        "x",
      ),
    );
    expect(editor.getMarkdown()).toContain("```ts");
    editor.commands.updateAttributes("codeBlock", {
      language: "not-a-real-language",
    });
    await waitFor(() =>
      expect(
        editor.view.dom.querySelectorAll(".writer-code-token"),
      ).toHaveLength(0),
    );
    editor.destroy();
  });
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
  it("keeps the cover URL in sync when its image URL changes or is removed", () => {
    let cover = "https://example.com/old.png";
    const editor = new Editor({
      extensions: editorExtensions(),
      content: "![사진](https://example.com/old.png)",
      contentType: "markdown",
      onUpdate: ({ transaction }) => {
        cover = nextCoverImageSrc(transaction, cover);
      },
    });
    editor.commands.setNodeSelection(0);
    editor.commands.updateAttributes("image", {
      src: "https://example.com/new.png",
    });
    expect(cover).toBe("https://example.com/new.png");
    editor.commands.deleteSelection();
    expect(cover).toBe("");
    editor.destroy();
  });
  it("does not move the cover to a different image when its image is deleted", () => {
    let cover = "https://example.com/cover.png";
    const editor = new Editor({
      extensions: editorExtensions(),
      content:
        "![대표](https://example.com/cover.png)\n\n![다음](https://example.com/next.png)",
      contentType: "markdown",
      onUpdate: ({ transaction }) => {
        cover = nextCoverImageSrc(transaction, cover);
      },
    });
    editor.commands.setNodeSelection(0);
    editor.commands.deleteSelection();
    expect(cover).toBe("");
    editor.destroy();
  });
  it("keeps the cover while another copy of the same image remains", () => {
    const src = "https://example.com/cover.png";
    let cover = src;
    const editor = new Editor({
      extensions: editorExtensions(),
      content: `![첫 번째](${src})\n\n![두 번째](${src})`,
      contentType: "markdown",
      onUpdate: ({ transaction }) => {
        cover = nextCoverImageSrc(transaction, cover);
      },
    });
    const removeFirstImage = () => {
      let position = -1;
      let size = 0;
      editor.state.doc.descendants((node, offset) => {
        if (node.type.name === "image" && position === -1) {
          position = offset;
          size = node.nodeSize;
        }
      });
      editor.commands.deleteRange({ from: position, to: position + size });
    };
    removeFirstImage();
    expect(cover).toBe(src);
    removeFirstImage();
    expect(cover).toBe("");
    editor.destroy();
  });
  it("keeps the batch identity of separate photos through Markdown reopening", () => {
    const batchId = "12345678-1234-1234-1234-123456789abc";
    const editor = new Editor({ extensions: editorExtensions() });
    editor.commands.insertContentAt(0, [
      {
        type: "image",
        attrs: { src: "https://example.com/one.png", alt: "하나", batchId },
      },
      {
        type: "image",
        attrs: { src: "https://example.com/two.png", alt: "둘", batchId },
      },
    ]);
    const saved = editor.getMarkdown();
    expect(saved.match(/blog-image:v1:/g)).toHaveLength(2);
    editor.commands.setContent(saved, { contentType: "markdown" });
    const images: string[] = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === "image") images.push(node.attrs.batchId);
    });
    expect(images).toEqual([batchId, batchId]);
    editor.destroy();
  });
  it("saves image groups, restores their layout and updates the cover on removal", () => {
    let cover = "https://example.com/second.png";
    const images = [
      { src: "https://example.com/first.png", alt: "첫 [사진]" },
      { src: cover, alt: "둘째 사진" },
    ];
    const editor = new Editor({
      extensions: editorExtensions(),
      content: "시작",
      contentType: "markdown",
      onUpdate: ({ transaction }) => {
        cover = nextCoverImageSrc(transaction, cover);
      },
    });
    editor.commands.insertContentAt(editor.state.doc.content.size, {
      type: "image",
      attrs: {
        ...images[0],
        layout: "collage",
        images,
        caption: "함께 찍은 사진",
      },
    });
    expect(editor.commands.undo()).toBe(true);
    expect(editor.getMarkdown()).not.toContain("blog-image-group:v1:");
    expect(editor.commands.redo()).toBe(true);
    cover = images[1].src;
    const saved = editor.getMarkdown();
    expect(saved).toContain("blog-image-group:v1:");
    expect(
      readImageGroup(saved.match(/"(blog-image-group:[^"]+)"/)?.[1]),
    ).toMatchObject({
      layout: "collage",
      images,
      caption: "함께 찍은 사진",
    });
    editor.commands.setContent(saved, { contentType: "markdown" });
    expect(editor.state.doc.child(1).attrs).toMatchObject({
      layout: "collage",
      images,
      caption: "함께 찍은 사진",
    });
    expect(editor.state.doc.child(1).attrs.alt).toBe("첫 [사진]");
    const publicView = document.createElement("div");
    publicView.innerHTML = renderToStaticMarkup(
      <MarkdownContent source={saved} />,
    );
    expect(
      publicView.querySelectorAll(".markdown-image-group img"),
    ).toHaveLength(2);
    expect(publicView.querySelector(".markdown-image-group")).toHaveAttribute(
      "data-layout",
      "collage",
    );
    expect(publicView.querySelector(".markdown-image-group")).toHaveTextContent(
      "함께 찍은 사진",
    );
    const groupPosition = editor.state.doc.firstChild!.nodeSize;
    editor.commands.setNodeSelection(groupPosition);
    editor.commands.updateAttributes("image", {
      images: [
        images[0],
        { src: "https://example.com/third.png", alt: "셋째" },
      ],
      layout: "slide",
    });
    expect(cover).toBe("https://example.com/third.png");
    const slideView = document.createElement("div");
    slideView.innerHTML = renderToStaticMarkup(
      <MarkdownContent source={editor.getMarkdown()} />,
    );
    expect(slideView.querySelector('[aria-label="다음 사진"]')).not.toBeNull();
    editor.commands.deleteSelection();
    expect(cover).toBe("");
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
