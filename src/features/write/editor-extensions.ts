import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import { Table, TableKit } from "@tiptap/extension-table";
import { Markdown, MarkdownManager } from "@tiptap/markdown";

// 기본 토크나이저가 문단 중간을 표로 인식해 셀을 누락하는 문제를 피한다.
const SafeTable = Table.extend({
  markdownTokenizer: { ...Table.config.markdownTokenizer!, start: () => -1 },
});
export function editorExtensions() {
  return [
    StarterKit.configure({ underline: false, link: { openOnClick: false } }),
    Image.configure({ allowBase64: false }),
    TaskList,
    TaskItem.configure({
      nested: true,
      HTMLAttributes: { "data-type": "taskItem" },
    }),
    TableKit.configure({ table: false }),
    SafeTable,
    Markdown,
  ];
}

// 편집기가 지원하지 않는 HTML이 저장 과정에서 사라지는 것을 막는다.
export function hasUnsupportedHtml(source: string) {
  const manager = new MarkdownManager();
  let unsupported = false;
  manager.instance.walkTokens(manager.instance.lexer(source), (token) => {
    if (token.type === "html") unsupported = true;
  });
  return unsupported;
}
