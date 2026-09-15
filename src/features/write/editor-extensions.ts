import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import { Table, TableKit } from "@tiptap/extension-table";
import { Markdown, MarkdownManager } from "@tiptap/markdown";

// The upstream start hint can split malformed tables mid-paragraph and drop cells.
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

// Unsupported HTML must not silently disappear when an old post is edited.
export function hasUnsupportedHtml(source: string) {
  const manager = new MarkdownManager();
  let unsupported = false;
  manager.instance.walkTokens(manager.instance.lexer(source), (token) => {
    if (token.type === "html") unsupported = true;
  });
  return unsupported;
}
