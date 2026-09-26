import remarkParse from "remark-parse";
import { unified } from "unified";

import { markdownPlugins } from "@/lib/markdown-plugins";

const DEFAULT_EXCERPT_LENGTH = 150;
const markdown = unified().use(remarkParse).use(markdownPlugins);
const graphemes = new Intl.Segmenter("ko", { granularity: "grapheme" });
const blockTypes = new Set([
  "root",
  "blockquote",
  "list",
  "listItem",
  "table",
  "tableRow",
]);

type TextNode = { type: string; value?: string; children?: TextNode[] };

function textOf(node: TextNode): string {
  if (["code", "html", "image", "thematicBreak"].includes(node.type)) return "";
  if (node.type === "break") return " ";
  if ("value" in node && typeof node.value === "string") return node.value;
  if (!node.children) return "";
  return node.children
    .map(textOf)
    .filter(Boolean)
    .join(blockTypes.has(node.type) ? " " : "");
}

export function createExcerpt(source: string, length = DEFAULT_EXCERPT_LENGTH) {
  const tree = markdown.runSync(markdown.parse(source), source);
  const plainText = textOf(tree).replace(/\s+/g, " ").trim();
  let preview = "";
  let count = 0;
  for (const { segment } of graphemes.segment(plainText)) {
    if (count++ === length) return `${preview.trim()}…`;
    preview += segment;
  }
  return plainText;
}
