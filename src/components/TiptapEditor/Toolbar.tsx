// src/components/TiptapEditor/Toolbar.tsx
import { Box, IconButton, Tooltip, Input } from "@mui/material";
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatAlignJustify,
  Image as ImageIcon,
} from "@mui/icons-material";
import HeadingDropdown from "./HeadingDropdown";
import ListDropdown from "./ListDropdown";
import HighlightPopover from "./HighlightPopover";
import { Editor } from "@tiptap/react";
import { useState } from "react";
import type { RefObject } from "react";

interface ToolbarProps {
  editor: Editor;
  onImageInsert: (file: File) => void;
  fileInputRef: RefObject<HTMLInputElement>;
}

export default function Toolbar({
  editor,
  onImageInsert,
  fileInputRef,
}: ToolbarProps) {
  const [anchorHeading, setAnchorHeading] = useState<null | HTMLElement>(null);
  const [anchorList, setAnchorList] = useState<null | HTMLElement>(null);
  const [anchorHighlight, setAnchorHighlight] = useState<null | HTMLElement>(
    null
  );

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const validateAndInsertImage = (file: File) => {
    const isValidType = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
    ].includes(file.type);
    const isValidSize = file.size <= 5 * 1024 * 1024;

    if (!isValidType) return alert("지원하지 않는 파일 형식입니다.");
    if (!isValidSize) return alert("최대 5MB 이하 파일만 업로드 가능합니다.");

    onImageInsert(file);
  };

  return (
    <Box className="toolbar">
      <HeadingDropdown
        editor={editor}
        anchorEl={anchorHeading}
  onClick={(e) => setAnchorHeading(e.currentTarget)}
        onClose={() => setAnchorHeading(null)}
      />
      <ListDropdown
        editor={editor}
        anchorEl={anchorList}
  onClick={(e) => setAnchorList(e.currentTarget)}
        onClose={() => setAnchorList(null)}
      />
      <Tooltip title="Bold">
        <IconButton onClick={() => editor.chain().focus().toggleBold().run()}>
          <FormatBold />
        </IconButton>
      </Tooltip>
      <Tooltip title="Italic">
        <IconButton onClick={() => editor.chain().focus().toggleItalic().run()}>
          <FormatItalic />
        </IconButton>
      </Tooltip>
      <Tooltip title="Underline">
        <IconButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <FormatUnderlined />
        </IconButton>
      </Tooltip>
      <HighlightPopover
        editor={editor}
        anchorEl={anchorHighlight}
  onClick={(e) => setAnchorHighlight(e.currentTarget)}
        onClose={() => setAnchorHighlight(null)}
      />
      <Tooltip title="Left">
        <IconButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <FormatAlignLeft />
        </IconButton>
      </Tooltip>
      <Tooltip title="Center">
        <IconButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <FormatAlignCenter />
        </IconButton>
      </Tooltip>
      <Tooltip title="Right">
        <IconButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <FormatAlignRight />
        </IconButton>
      </Tooltip>
      <Tooltip title="Justify">
        <IconButton
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          <FormatAlignJustify />
        </IconButton>
      </Tooltip>
      <Tooltip title="Insert Image">
        <IconButton onClick={handleUploadClick}>
          <ImageIcon />
        </IconButton>
      </Tooltip>
      <Input
        type="file"
        inputRef={fileInputRef}
        onChange={(e) => {
          const input = e.target as HTMLInputElement;
          const file = input.files?.[0];
          if (file) validateAndInsertImage(file);
        }}
        sx={{ display: "none" }}
      />
    </Box>
  );
}
