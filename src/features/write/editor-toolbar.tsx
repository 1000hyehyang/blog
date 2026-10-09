"use client";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Table2,
  Undo2,
  Redo2,
  ImagePlus,
} from "lucide-react";

import { IconButton } from "./icon-button";
import styles from "./writer.module.css";

export function EditorToolbar({
  editor,
  busy,
  unsupported,
  onChooseImage,
}: {
  editor: Editor | null;
  busy: boolean;
  unsupported: boolean;
  onChooseImage: () => void;
}) {
  const active = useEditorState({
    editor,
    selector: ({ editor }) => {
      return {
        bold: editor?.isActive("bold"),
        italic: editor?.isActive("italic"),
        underline: editor?.isActive("underline"),
        strike: editor?.isActive("strike"),
        bulletList: editor?.isActive("bulletList"),
        orderedList: editor?.isActive("orderedList"),
        taskList: editor?.isActive("taskList"),
        blockquote: editor?.isActive("blockquote"),
        codeBlock: editor?.isActive("codeBlock"),
        codeLanguage: editor?.getAttributes("codeBlock").language as
          string | undefined,
      };
    },
  });
  const formattingDisabled = !editor || unsupported;
  return (
    <fieldset className={styles.toolbar} disabled={busy} aria-label="본문 서식">
      <IconButton
        label="이미지"
        disabled={formattingDisabled}
        onClick={onChooseImage}
      >
        <ImagePlus size={20} />
      </IconButton>
      <span className={styles.fontLabel}>기본 서체</span>
      <span className={styles.separator} />
      {(
        [
          [
            "굵게",
            Bold,
            active?.bold,
            () => editor?.chain().focus().toggleBold().run(),
          ],
          [
            "기울임",
            Italic,
            active?.italic,
            () => editor?.chain().focus().toggleItalic().run(),
          ],
          [
            "밑줄",
            Underline,
            active?.underline,
            () => editor?.chain().focus().toggleUnderline().run(),
          ],
          [
            "취소선",
            Strikethrough,
            active?.strike,
            () => editor?.chain().focus().toggleStrike().run(),
          ],
          [
            "인용",
            Quote,
            active?.blockquote,
            () => editor?.chain().focus().toggleBlockquote().run(),
          ],
          [
            "목록",
            List,
            active?.bulletList,
            () => editor?.chain().focus().toggleBulletList().run(),
          ],
          [
            "번호 목록",
            ListOrdered,
            active?.orderedList,
            () => editor?.chain().focus().toggleOrderedList().run(),
          ],
          [
            "체크리스트",
            ListTodo,
            active?.taskList,
            () => editor?.chain().focus().toggleTaskList().run(),
          ],
          [
            "표",
            Table2,
            false,
            () =>
              editor
                ?.chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: false })
                .run(),
          ],
          [
            "실행 취소",
            Undo2,
            false,
            () => editor?.chain().focus().undo().run(),
          ],
          [
            "다시 실행",
            Redo2,
            false,
            () => editor?.chain().focus().redo().run(),
          ],
        ] as const
      ).map(([label, Icon, pressed, command]) => (
        <IconButton
          key={label}
          label={label}
          aria-pressed={Boolean(pressed)}
          disabled={formattingDisabled}
          onClick={command}
        >
          <Icon size={19} strokeWidth={1.7} />
        </IconButton>
      ))}
      {active?.codeBlock && (
        <input
          className={styles.codeLanguage}
          aria-label="코드 언어"
          placeholder="언어 (ts, js, python…)"
          value={active.codeLanguage ?? ""}
          maxLength={32}
          disabled={formattingDisabled}
          onChange={(event) =>
            editor?.commands.updateAttributes("codeBlock", {
              language: event.target.value.toLowerCase().replace(/\s/g, ""),
            })
          }
        />
      )}
    </fieldset>
  );
}
