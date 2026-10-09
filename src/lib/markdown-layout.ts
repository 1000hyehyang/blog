import type { Element, Root } from "hast";

export function rehypeContentLayout() {
  return (tree: Root) => {
    function visit(node: Root | Element) {
      // pre-wrap에서는 <br> 뒤 개행까지 표시하면 두 줄이 된다.
      node.children.forEach((child, index) => {
        const next = node.children[index + 1];
        if (
          child.type === "element" &&
          child.tagName === "br" &&
          next?.type === "text"
        )
          next.value = next.value.replace(/^\n/, "");
      });
      for (const child of node.children) {
        if (child.type === "element") visit(child);
      }
      if (node.type !== "element" || node.tagName !== "li") return;

      if (
        node.children[0] &&
        !(node.children[0].type === "text" && node.children[0].value === "\n")
      ) {
        const block = node.children.findIndex(
          (child) =>
            child.type === "element" &&
            [
              "p",
              "ul",
              "ol",
              "blockquote",
              "pre",
              "h1",
              "h2",
              "h3",
              "h4",
              "h5",
              "h6",
              "hr",
              "table",
              "div",
            ].includes(child.tagName),
        );
        const count = block === -1 ? node.children.length : block;
        if (count) {
          node.children.unshift({
            type: "element",
            tagName: "p",
            properties: {},
            children: node.children.splice(0, count),
          });
        }
      }

      const paragraph = node.children.find(
        (child) => child.type === "element" && child.tagName === "p",
      );
      if (paragraph?.type !== "element") return;
      const checkbox = paragraph.children[0];
      if (
        checkbox?.type !== "element" ||
        checkbox.tagName !== "input" ||
        checkbox.properties.type !== "checkbox"
      )
        return;
      paragraph.children.shift();
      const text = paragraph.children[0];
      if (text?.type === "text") text.value = text.value.replace(/^ /, "");
      checkbox.properties.ariaLabel = "완료 상태";
      node.properties.dataType = "taskItem";
      node.children = [
        {
          type: "element",
          tagName: "label",
          properties: {},
          children: [checkbox],
        },
        {
          type: "element",
          tagName: "div",
          properties: {},
          children: node.children,
        },
      ];
    }
    visit(tree);
  };
}
