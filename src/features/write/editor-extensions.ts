import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import { Table, TableKit } from "@tiptap/extension-table";
import { Markdown, MarkdownManager } from "@tiptap/markdown";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageNodeView } from "./image-editor";
import {
  hasImageSettings,
  readImageMetadata,
  writeImageMetadata,
  type ImageMetadata,
} from "@/lib/image-metadata";

// 기본 토크나이저가 문단 중간을 표로 인식해 셀을 누락하는 문제를 피한다.
const SafeTable = Table.extend({
  markdownTokenizer: { ...Table.config.markdownTokenizer!, start: () => -1 },
});

const EditableImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
  addAttributes() {
    const image = (element: HTMLElement) =>
      element.tagName === "FIGURE" ? element.querySelector("img") : element;
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          image(element)?.getAttribute("src"),
      },
      alt: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          image(element)?.getAttribute("alt"),
      },
      title: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          image(element)?.getAttribute("title"),
      },
      align: {
        default: "center",
        parseHTML: (element: HTMLElement) => {
          const value = element.getAttribute("data-align");
          return element.tagName === "FIGURE" &&
            ["left", "center", "right"].includes(value ?? "")
            ? value
            : "center";
        },
      },
      width: {
        default: 100,
        parseHTML: (element: HTMLElement) => {
          const value = Number(element.getAttribute("data-width"));
          return element.tagName === "FIGURE" &&
            Number.isInteger(value) &&
            value >= 25 &&
            value <= 100
            ? value
            : 100;
        },
      },
      caption: {
        default: "",
        parseHTML: (element: HTMLElement) =>
          element.tagName === "FIGURE"
            ? element.querySelector("figcaption")?.textContent?.slice(0, 300) ||
              ""
            : "",
      },
    };
  },
  parseHTML() {
    return [
      { tag: "figure[data-blog-image]" },
      { tag: 'img[src]:not([src^="data:"])' },
    ];
  },
  renderHTML({ node }) {
    const { src, alt, title, ...settings } = node.attrs as ImageMetadata & {
      src: string;
      alt: string | null;
    };
    const image = ["img", { src, alt, title }] as const;
    if (!hasImageSettings(settings)) return image;
    return [
      "figure",
      {
        "data-blog-image": "",
        "data-align": settings.align,
        "data-width": settings.width,
        style: `width:${settings.width}%`,
      },
      image,
      ...(settings.caption ? [["figcaption", {}, settings.caption]] : []),
    ];
  },
  parseMarkdown: (token, helpers) => {
    const settings = readImageMetadata(token.title);
    return helpers.createNode("image", {
      src: token.href,
      alt: token.text,
      ...settings,
    });
  },
  renderMarkdown: (node) => {
    const {
      src = "",
      alt = "",
      ...settings
    } = node.attrs as ImageMetadata & {
      src: string;
      alt: string;
    };
    const title = writeImageMetadata(settings);
    return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
  },
});
export function editorExtensions() {
  return [
    StarterKit.configure({ underline: false, link: { openOnClick: false } }),
    EditableImage.configure({ allowBase64: false }),
    TaskList,
    TaskItem.configure({
      nested: true,
      HTMLAttributes: { "data-type": "taskItem" },
    }),
    TableKit.configure({ table: false }),
    SafeTable,
    Markdown,
  ];
}

// 편집기가 지원하지 않는 HTML이 저장 과정에서 사라지는 것을 막는다.
export function hasUnsupportedHtml(source: string) {
  const manager = new MarkdownManager();
  let unsupported = false;
  manager.instance.walkTokens(manager.instance.lexer(source), (token) => {
    if (token.type === "html") unsupported = true;
  });
  return unsupported;
}
