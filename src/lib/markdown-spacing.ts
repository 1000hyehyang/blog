import type { Root, RootContent } from "mdast";

// 이전 편집기는 빈 문단을 별도 표식 없이 연속 개행으로 저장했다.
export function remarkParagraphSpacing() {
  return (tree: Root, file: { value: string | Uint8Array }) => {
    const source =
      typeof file.value === "string"
        ? file.value
        : new TextDecoder().decode(file.value);
    const children: RootContent[] = [];
    let previousEnd = 0;

    function addGap(end: number, boundary: boolean) {
      const gap = source.slice(previousEnd, end).replace(/\r\n/g, "\n");
      if (gap.trim()) return;
      const separators = (gap.match(/\n\n/g) ?? []).length;
      const count = Math.max(0, separators - (boundary ? 0 : 1));
      for (let i = 0; i < count; i++) {
        children.push({ type: "paragraph", children: [] });
      }
    }

    for (const node of tree.children) {
      if (node.position) {
        addGap(node.position.start.offset!, children.length === 0);
        previousEnd = node.position.end.offset!;
      }
      children.push(node);
    }
    if (tree.children.length) addGap(source.length, true);
    tree.children = children;
  };
}
