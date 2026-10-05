import StarterKit from "@tiptap/starter-kit";
import Paragraph from "@tiptap/extension-paragraph";
import Image from "@tiptap/extension-image";
import Link, { isAllowedUri } from "@tiptap/extension-link";
import type { JSONContent } from "@tiptap/core";
import type { DOMOutputSpec } from "@tiptap/pm/model";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import { Table, TableKit } from "@tiptap/extension-table";
import { Markdown, MarkdownManager } from "@tiptap/markdown";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageNodeView } from "./image-editor";
import { StandaloneLinkExtension } from "./standalone-link-widget";
import { CodeHighlighting } from "./code-highlighting";
import { FootnoteDefinition, FootnoteReference } from "./footnote-extensions";
import {
  asImageGroup,
  readImageGroup,
  writeImageGroup,
  type ImageGroup,
} from "@/lib/image-group";
import {
  hasImageSettings,
  readImageMetadata,
  readImageDimensions,
  writeImageMetadata,
  type ImageMetadata,
} from "@/lib/image-metadata";

// 문단 중간에서 표 토큰화를 시작하면 셀이 누락된다.
const SafeTable = Table.extend({
  markdownTokenizer: { ...Table.config.markdownTokenizer!, start: () => -1 },
});

// Markdown 파서가 빈 문단을 제거하지 않도록 표식을 남긴다.
const PreservedParagraph = Paragraph.extend({
  renderMarkdown: (node, helpers) =>
    node.content?.length ? helpers.renderChildren(node.content) : "&nbsp;",
});

// 블록 이미지에는 링크 마크를 붙일 수 없어 노드 속성에 저장한다.
const ImageAwareLink = Link.extend({
  parseMarkdown(token, helpers) {
    const attrs = { href: token.href, title: token.title || null };
    function link(node: JSONContent): JSONContent {
      if (node.type === "image")
        return {
          ...node,
          attrs: {
            ...node.attrs,
            linkHref: attrs.href,
            linkTitle: attrs.title,
          },
        };
      if (node.type === "text")
        return {
          ...node,
          marks: [...(node.marks ?? []), { type: "link", attrs }],
        };
      return {
        ...node,
        ...(node.content && { content: node.content.map(link) }),
      };
    }
    return helpers.parseInline(token.tokens ?? []).map(link);
  },
}).configure({ openOnClick: false });

type EditableImageAttributes = ImageMetadata &
  Partial<ImageGroup> & {
    src: string;
    alt: string;
    linkHref: string | null;
    linkTitle: string | null;
  };

function markdownTitle(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const EditableImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
  addAttributes() {
    const image = (element: HTMLElement) =>
      element.tagName === "FIGURE" ? element.querySelector("img") : element;
    return {
      ...this.parent?.(),
      linkHref: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          image(element)?.closest("a")?.getAttribute("href") ?? null,
      },
      linkTitle: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          image(element)?.closest("a")?.getAttribute("title") ?? null,
      },
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
      dimensions: {
        default: null,
        rendered: false,
        parseHTML: (element: HTMLElement) =>
          readImageDimensions({
            width: Number(image(element)?.getAttribute("width")),
            height: Number(image(element)?.getAttribute("height")),
          }) ?? null,
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
    const {
      src,
      alt,
      title,
      layout,
      images,
      batchId,
      linkHref,
      linkTitle,
      ...settings
    } = node.attrs as EditableImageAttributes;
    const wrap = (content: DOMOutputSpec): DOMOutputSpec =>
      linkHref && isAllowedUri(linkHref)
        ? ["a", { href: linkHref, title: linkTitle }, content]
        : content;
    const group = asImageGroup({ layout, images, caption: settings.caption });
    if (group)
      return wrap([
        "figure",
        { "data-blog-image-group": writeImageGroup(group) },
        ...group.images.map(({ dimensions, ...item }) => [
          "img",
          { ...item, ...dimensions },
        ]),
        ...(group.caption ? [["figcaption", {}, group.caption]] : []),
      ]);
    const image = [
      "img",
      {
        src,
        alt,
        title,
        ...settings.dimensions,
        "data-blog-image-batch": batchId,
      },
    ] as const;
    if (!hasImageSettings(settings)) return wrap(image);
    return wrap([
      "figure",
      {
        "data-blog-image": "",
        "data-align": settings.align,
        "data-width": settings.width,
        style: `width:${settings.width}%`,
      },
      image,
      ...(settings.caption ? [["figcaption", {}, settings.caption]] : []),
    ]);
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
      linkHref,
      linkTitle,
      ...settings
    } = node.attrs as EditableImageAttributes;
    const markdownAlt = alt
      .replace(/([\\\[\]])/g, "\\$1")
      .replace(/[\r\n]/g, " ");
    const group = asImageGroup({ layout, images, caption });
    const title = writeImageMetadata({ ...settings, caption });
    const image = group
      ? `![${markdownAlt}](${src} "${writeImageGroup(group)}")`
      : title
        ? `![${markdownAlt}](${src} "${markdownTitle(title)}")`
        : `![${markdownAlt}](${src})`;
    if (!linkHref) return image;
    const destination = linkHref
      .replace(/</g, "%3C")
      .replace(/>/g, "%3E")
      .replace(/[\r\n]/g, "");
    return `[${image}](<${destination}>${linkTitle ? ` "${markdownTitle(linkTitle)}"` : ""})`;
  },
});
export function editorExtensions() {
  return [
    StarterKit.configure({ link: false, paragraph: false }),
    PreservedParagraph,
    ImageAwareLink,
    EditableImage.configure({ allowBase64: false }),
    TaskList,
    TaskItem.configure({
      nested: true,
      HTMLAttributes: { "data-type": "taskItem" },
    }),
    TableKit.configure({ table: false }),
    SafeTable,
    FootnoteReference,
    FootnoteDefinition,
    Markdown,
    StandaloneLinkExtension,
    CodeHighlighting,
  ];
}

export function hasUnsupportedHtml(source: string) {
  const manager = new MarkdownManager();
  let unsupported = false;
  manager.instance.walkTokens(manager.instance.lexer(source), (token) => {
    if (token.type === "html") unsupported = true;
  });
  return unsupported;
}
