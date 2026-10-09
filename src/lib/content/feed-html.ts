import type { Root, RootContent } from "hast";
import { toHtml } from "hast-util-to-html";
import { defaultUrlTransform } from "react-markdown";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import { markdownPlugins } from "@/lib/markdown-plugins";

const markdown = unified()
  .use(remarkParse)
  .use(markdownPlugins)
  .use(remarkRehype, { allowDangerousHtml: true });

export function renderFeedHtml(source: string, postUrl: string) {
  const tree = markdown.runSync(markdown.parse(source), source);
  function resolveLinks(node: Root | RootContent) {
    if (node.type === "element") {
      for (const key of ["href", "src"] as const) {
        const value = node.properties[key];
        if (typeof value !== "string") continue;
        const safe = defaultUrlTransform(value);
        try {
          node.properties[key] = safe ? new URL(safe, postUrl).href : "";
        } catch {
          node.properties[key] = "";
        }
      }
    }
    if ("children" in node) node.children.forEach(resolveLinks);
  }
  resolveLinks(tree);
  // 블로그 본문과 마찬가지로 원시 HTML을 이스케이프해 출력한다.
  return toHtml(tree);
}
