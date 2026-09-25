"use client";

import { useMemo, useState } from "react";
import { useEditor } from "@tiptap/react";
import { editorExtensions } from "./editor-extensions";
import { ImageEditor, nextCoverImageSrc } from "./image-editor";
import styles from "./writer.module.css";

const sample =
  "![블로그 이미지](/og-blog.png)\n\n두 이미지를 선택해 정렬, 크기, 캡션과 대표 이미지를 시험해 보세요.\n\n![앱 아이콘](/web-app-manifest-512x512.png)";

export function ImageEditorDemo() {
  const extensions = useMemo(() => editorExtensions(), []);
  const [coverImageSrc, setCoverImageSrc] = useState("");
  const [saved, setSaved] = useState(sample);
  const editor = useEditor({
    extensions,
    content: sample,
    contentType: "markdown",
    immediatelyRender: false,
    onUpdate: ({ transaction }) => {
      setCoverImageSrc((src) => nextCoverImageSrc(transaction, src));
    },
    editorProps: { attributes: { "aria-label": "이미지 편집 데모" } },
  });

  return (
    <main className={styles.imageDemo}>
      <h1>이미지 편집 테스트</h1>
      <p>
        이미지를 클릭해 편집하세요. 이 페이지는 로컬 이미지를 사용하며
        업로드하지 않습니다.
      </p>
      <div className={styles.imageDemoActions}>
        <button type="button" onClick={() => editor?.commands.undo()}>
          실행 취소
        </button>
        <button type="button" onClick={() => editor?.commands.redo()}>
          다시 실행
        </button>
        <button
          type="button"
          onClick={() => setSaved(editor?.getMarkdown() ?? "")}
        >
          본문 저장
        </button>
        <button
          type="button"
          onClick={() =>
            editor?.commands.setContent(saved, { contentType: "markdown" })
          }
        >
          저장한 본문 다시 열기
        </button>
      </div>
      <p aria-live="polite">대표 이미지: {coverImageSrc || "없음"}</p>
      <div className={styles.editor}>
        {editor && (
          <ImageEditor
            editor={editor}
            coverImageSrc={coverImageSrc}
            onCoverImageChange={setCoverImageSrc}
          />
        )}
      </div>
      <details>
        <summary>저장한 Markdown</summary>
        <pre>{saved}</pre>
      </details>
    </main>
  );
}
