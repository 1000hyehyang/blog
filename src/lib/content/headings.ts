import type { Root, RootContent } from "mdast";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { markdownPlugins } from "../markdown-plugins";
import { headingText } from "../markdown-headings";
import type { PostHeading } from "./index";

const markdown = unified().use(remarkParse).use(markdownPlugins);

export function extractHeadings(source: string): PostHeading[] {
  const tree = markdown.runSync(markdown.parse(source), source) as Root;
  const headings: PostHeading[] = [];
  function visit(node: Root | RootContent) {
    if (node.type === "heading" && node.depth <= 3) {
      headings.push({
        level: node.depth as PostHeading["level"],
        text: headingText(node).replace(/\s+/g, " ").trim(),
        id: String(node.data?.hProperties?.id),
      });
    }
    if ("children" in node) node.children.forEach(visit);
  }
  visit(tree);
  return headings;
}
