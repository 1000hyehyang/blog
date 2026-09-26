import type { Root } from "mdast";

type Node = {
  type: string;
  value?: string;
  children?: Node[];
  data?: { hName: string };
  position?: { start: { offset?: number }; end: { offset?: number } };
};

const inlineParents = new Set([
  "paragraph",
  "heading",
  "strong",
  "emphasis",
  "delete",
  "link",
  "linkReference",
  "tableCell",
]);

export function remarkUnderline() {
  return (tree: Root, file: { value: string | Uint8Array }) => {
    const source =
      typeof file.value === "string"
        ? file.value
        : new TextDecoder().decode(file.value);
    function visit(node: Node) {
      node.children?.forEach(visit);
      if (!node.children || !inlineParents.has(node.type)) return;

      const result: Node[] = [];
      let underlined: Node[] | null = null;
      const add = (child: Node) => (underlined ?? result).push(child);

      for (const child of node.children) {
        const start = child.position?.start.offset;
        const end = child.position?.end.offset;
        if (child.type !== "text" || !child.value?.includes("++")) {
          add(child);
          continue;
        }

        const parts = child.value.split("++");
        const rawMarkers =
          start !== undefined && end !== undefined
            ? [...source.slice(start, end).matchAll(/(?:\\?\+){2}/g)]
            : [];
        for (const [index, part] of parts.entries()) {
          if (part) add({ type: "text", value: part });
          if (index === parts.length - 1) continue;
          if (
            (rawMarkers.length === parts.length - 1 &&
              rawMarkers[index][0].includes("\\")) ||
            (!underlined && /^\s/.test(parts[index + 1])) ||
            (underlined && /\s$/.test(part))
          ) {
            add({ type: "text", value: "++" });
            continue;
          }
          if (underlined) {
            result.push({
              type: "underline",
              data: { hName: "u" },
              children: underlined,
            });
            underlined = null;
          } else {
            underlined = [];
          }
        }
      }
      if (underlined) result.push({ type: "text", value: "++" }, ...underlined);
      node.children = result;
    }

    visit(tree as unknown as Node);
  };
}
