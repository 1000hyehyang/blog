import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import { Table, TableKit } from "@tiptap/extension-table";
import { Markdown, MarkdownManager } from "@tiptap/markdown";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageNodeView } from "./image-editor";
import { LinkPreviewExtension } from "./link-preview-widget";
import {
  asImageGroup,
  readImageGroup,
  writeImageGroup,
  type ImageGroup,
} from "@/lib/image-group";
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
      batchId: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          image(element)?.getAttribute("data-blog-image-batch"),
      },
      layout: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          readImageGroup(element.getAttribute("data-blog-image-group"))
            ?.layout ?? null,
      },
      images: {
        default: [],
        parseHTML: (element: HTMLElement) =>
          readImageGroup(element.getAttribute("data-blog-image-group"))
            ?.images ?? [],
      },
    };
  },
  parseHTML() {
    return [
      { tag: "figure[data-blog-image-group]" },
      { tag: "figure[data-blog-image]" },
      { tag: 'img[src]:not([src^="data:"])' },
    ];
  },
  renderHTML({ node }) {
    const { src, alt, title, layout, images, batchId, ...settings } =
      node.attrs as ImageMetadata & {
        src: string;
        alt: string | null;
      } & Partial<ImageGroup>;
    const group = asImageGroup({ layout, images, caption: settings.caption });
    if (group)
      return [
        "figure",
        { "data-blog-image-group": writeImageGroup(group) },
        ...group.images.map((item) => ["img", item]),
        ...(group.caption ? [["figcaption", {}, group.caption]] : []),
      ];
    const image = [
      "img",
      { src, alt, title, "data-blog-image-batch": batchId },
    ] as const;
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
    const group = readImageGroup(token.title);
    if (group && group.images[0].src === token.href)
      return helpers.createNode("image", {
        src: token.href,
        alt: token.text,
        title: null,
        ...group,
      });
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
      layout,
      images,
      caption,
      ...settings
    } = node.attrs as ImageMetadata & {
      src: string;
      alt: string;
    } & Partial<ImageGroup>;
    const markdownAlt = alt
      .replace(/([\\\[\]])/g, "\\$1")
      .replace(/[\r\n]/g, " ");
    const group = asImageGroup({ layout, images, caption });
    if (group) return `![${markdownAlt}](${src} "${writeImageGroup(group)}")`;
    const title = writeImageMetadata({ ...settings, caption });
    return title
      ? `![${markdownAlt}](${src} "${title}")`
      : `![${markdownAlt}](${src})`;
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
    LinkPreviewExtension,
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
