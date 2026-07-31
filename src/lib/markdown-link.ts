import { parseExternalHttpUrl } from "./link-preview";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getStandaloneExternalUrl(node: unknown): string | null {
  if (!isRecord(node) || !Array.isArray(node.children)) return null;
  if (node.children.length !== 1) return null;

  const link = node.children[0];
  if (
    !isRecord(link) ||
    link.type !== "element" ||
    link.tagName !== "a" ||
    !isRecord(link.properties) ||
    typeof link.properties.href !== "string" ||
    !Array.isArray(link.children) ||
    link.children.length !== 1
  ) {
    return null;
  }

  const text = link.children[0];
  if (
    !isRecord(text) ||
    text.type !== "text" ||
    typeof text.value !== "string"
  ) {
    return null;
  }

  const href = parseExternalHttpUrl(link.properties.href);
  const visibleUrl = parseExternalHttpUrl(text.value.trim());

  return href && visibleUrl && href.href === visibleUrl.href ? href.href : null;
}
