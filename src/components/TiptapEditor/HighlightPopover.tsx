// src/components/TiptapEditor/HighlightPopover.tsx
import { Editor } from "@tiptap/react";
import { IconButton, Tooltip, Popover, Box } from "@mui/material";
import { FormatColorFill } from "@mui/icons-material";

const HIGHLIGHT_COLORS = [
  "#FFEBEE", "#FFF9C4", "#E1F5FE", "#E8F5E9", "#F3E5F5"
];

interface HighlightPopoverProps {
  editor: Editor;
  anchorEl: HTMLElement | null;
  onClick: (e: React.MouseEvent<HTMLElement>) => void;
  onClose: () => void;
}

export default function HighlightPopover({
  editor,
  anchorEl,
  onClick,
  onClose,
}: HighlightPopoverProps) {
  return (
    <>
      <Tooltip title="Highlight">
        <IconButton onClick={onClick}>
          <FormatColorFill />
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={onClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ display: "flex", p: 1, gap: 1 }}>
          {HIGHLIGHT_COLORS.map((color) => (
            <Box
              key={color}
              onClick={() => {
                editor.chain().focus().toggleHighlight({ color }).run();
                onClose();
              }}
              sx={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                backgroundColor: color,
                cursor: "pointer",
                border: editor.isActive("highlight", { color })
                  ? "2px solid black"
                  : "1px solid #ccc",
              }}
            />
          ))}
          <Box
            onClick={() => {
              editor.chain().focus().unsetHighlight().run();
              onClose();
            }}
            sx={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              border: "1px solid #ccc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            ⛌
          </Box>
        </Box>
      </Popover>
    </>
  );
}
