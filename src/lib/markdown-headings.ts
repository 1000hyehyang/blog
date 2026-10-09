import type { Root } from "mdast";
import { toSlug } from "./content";

type HeadingNode = {
  type: string;
  depth?: number;
  value?: string;
  alt?: string | null;
  children?: HeadingNode[];
  data?: { hProperties?: Record<string, unknown> };
};

export function headingText(node: HeadingNode): string {
  return (
    node.value ?? node.alt ?? node.children?.map(headingText).join("") ?? ""
  );
}

export function remarkHeadingIds() {
  return (tree: Root) => {
    const used = new Set<string>();
    function visit(node: HeadingNode) {
      if (
        node.type === "heading" &&
        node.depth !== undefined &&
        node.depth <= 3
      ) {
        const base = toSlug(headingText(node)) || "section";
        let id = base;
        let suffix = 2;
        while (used.has(id)) id = `${base}-${suffix++}`;
        used.add(id);
        node.data = {
          ...node.data,
          hProperties: { ...node.data?.hProperties, id },
        };
      }
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}
