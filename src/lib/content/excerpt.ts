import type { MarkdownToken } from "@tiptap/core";
import { MarkdownManager } from "@tiptap/markdown";
import { parseEntities } from "parse-entities";

const DEFAULT_EXCERPT_LENGTH = 150;
const markdown = new MarkdownManager().instance;
const graphemes = new Intl.Segmenter("ko", { granularity: "grapheme" });
const literalPlus = "\uE000";

function tokenText(tokens: MarkdownToken[], separator = "\n"): string {
  return tokens
    .map((token) => {
      if (["code", "image", "html", "hr"].includes(token.type ?? "")) return "";
      if (token.type === "table") {
        const cells = [...(token.header ?? []), ...(token.rows ?? []).flat()];
        return cells.map((cell) => tokenText(cell.tokens ?? [], "")).join(" ");
      }
      if (token.items) return tokenText(token.items);
      if (token.tokens)
        return tokenText(
          token.tokens,
          ["list_item", "blockquote"].includes(token.type ?? "") ? " " : "",
        );
      if (token.type === "br") return " ";
      if (token.type === "text") return parseEntities(token.text ?? "");
      if (token.type === "escape")
        return parseEntities(token.text ?? "").replaceAll("+", literalPlus);
      if (token.type === "codespan")
        return (token.text ?? "").replaceAll("+", literalPlus);
      return "";
    })
    .filter(Boolean)
    .join(separator);
}

function isBareHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function legacyExcerpt(source: string, length: number) {
  const plainText = source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#>*_`~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plainText.length > length
    ? `${plainText.slice(0, length).trim()}…`
    : plainText;
}

export function createExcerpt(source: string, length = DEFAULT_EXCERPT_LENGTH) {
  const plainText = tokenText(markdown.lexer(source))
    .replace(
      /(?<![\p{L}\p{N}])\+\+(\S(?:[^\n]*?\S)?)\+\+(?![\p{L}\p{N}])/gu,
      "$1",
    )
    .replaceAll(literalPlus, "+")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  let preview = "";
  let count = 0;
  for (const { segment } of graphemes.segment(plainText)) {
    if (count++ === length) return `${preview.trim()}…`;
    preview += segment;
  }
  return plainText;
}

export function resolveExcerpt(
  value: string | undefined,
  body: string,
  coverImage: string,
) {
  const candidate = value?.trim();
  if (candidate && !isBareHttpUrl(candidate) && candidate !== coverImage) {
    return candidate === legacyExcerpt(body, DEFAULT_EXCERPT_LENGTH)
      ? createExcerpt(body)
      : candidate;
  }

  return createExcerpt(body);
}
