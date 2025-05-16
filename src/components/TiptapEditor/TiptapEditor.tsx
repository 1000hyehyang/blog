// src/components/TiptapEditor/TiptapEditor.tsx
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Heading from "@tiptap/extension-heading";
import Placeholder from "@tiptap/extension-placeholder";
import { Box } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import axiosInstance from "../../lib/axiosInstance";
import Toolbar from "./Toolbar";
import "./editor.css";

interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function TiptapEditor({
  value,
  onChange,
  placeholder,
}: TiptapEditorProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(
    null
  ) as React.RefObject<HTMLInputElement>;

  const [editorContent, setEditorContent] = useState(value || "");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Underline,
      Link,
      Image,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Heading.configure({ levels: [1, 2, 3, 4] }),
      Placeholder.configure({
        placeholder: placeholder || "내용을 입력하세요...",
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setEditorContent(html);
      onChange?.(html);
    },
  });

  useEffect(() => {
    if (editor && value !== editorContent) {
      editor.commands.setContent(value);
      setEditorContent(value);
    }
  }, [value, editor]);

  const handleImageInsert = async (file: File) => {
    if (!file || !editor) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("directory", "editor-images");

      const res = await axiosInstance.post("/api/uploads", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const imageUrl = res.data.data;
      editor.chain().focus().setImage({ src: imageUrl }).run();
      onChange(editor.getHTML());
    } catch {
      alert("이미지 업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  if (!editor) return null;

  return (
    <Box
      className="editor-container"
      sx={{ width: "100%", position: "relative" }}
    >
      <Toolbar
        editor={editor}
        fileInputRef={fileInputRef}
        onImageInsert={handleImageInsert}
      />
      {uploading && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255,255,255,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10,
          }}
        >
          이미지 업로드 중...
        </Box>
      )}
      <EditorContent editor={editor} className="tiptap" />
    </Box>
  );
}
