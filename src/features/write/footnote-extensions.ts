import { Node } from "@tiptap/core";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";

// Use the same footnote grammar as the public Markdown renderer, including
// multiline definitions and nested blocks, rather than guessing block endings.
const parser = unified().use(remarkParse).use(remarkGfm);

export const FootnoteReference = Node.create({
  name: "footnoteReference",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes: () => ({
    label: {
      default: "",
      parseHTML: (element) => element.getAttribute("data-footnote-reference"),
    },
  }),
  parseHTML: () => [{ tag: "sup[data-footnote-reference]" }],
  renderHTML: ({ node }) => [
    "sup",
    { "data-footnote-reference": node.attrs.label },
    `[^${node.attrs.label}]`,
  ],
  markdownTokenizer: {
    name: "footnoteReference",
    level: "inline",
    start: (source) => source.indexOf("[^"),
    tokenize(source) {
      const match = /^\[\^([^\s\[\]]+)\]/.exec(source);
      if (match)
        return { type: "footnoteReference", raw: match[0], label: match[1] };
    },
  },
  parseMarkdown: (token, helpers) =>
    helpers.createNode("footnoteReference", { label: token.label }),
  renderMarkdown: (node) => `[^${node.attrs?.label}]`,
});

export const FootnoteDefinition = Node.create({
  name: "footnoteDefinition",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes: () => ({
    label: {
      default: "",
      parseHTML: (element) => element.getAttribute("data-footnote-definition"),
    },
  }),
  parseHTML: () => [{ tag: "div[data-footnote-definition]" }],
  renderHTML: ({ node }) => [
    "div",
    {
      "data-footnote-definition": node.attrs.label,
      "aria-label": `각주 ${node.attrs.label}`,
    },
    0,
  ],
  markdownTokenizer: {
    name: "footnoteDefinition",
    level: "block",
    start: (source) => source.search(/^ {0,3}\[\^[^\s\[\]]+\]:/m),
    tokenize(source, _tokens, lexer) {
      if (!/^ {0,3}\[\^[^\s\[\]]+\]:/.test(source)) return;
      const definition = parser.parse(source).children[0];
      if (definition?.type !== "footnoteDefinition") return;
      const raw = source.slice(0, definition.position!.end.offset);
      const body = raw
        .replace(/^ {0,3}\[\^[^\s\[\]]+\]:[ \t]*/, "")
        .replace(/\n(?: {4}|\t)/g, "\n");
      return {
        type: "footnoteDefinition",
        raw,
        label: definition.label ?? definition.identifier,
        tokens: lexer.blockTokens(body),
      };
    },
  },
  parseMarkdown: (token, helpers) =>
    helpers.createNode(
      "footnoteDefinition",
      { label: token.label },
      helpers.parseChildren(token.tokens ?? []),
    ),
  renderMarkdown: (node, helpers) => {
    const content = helpers.renderChildren(node.content ?? [], "\n\n");
    return `[^${node.attrs?.label}]: ${content.replace(/\n/g, "\n    ")}`;
  },
});
