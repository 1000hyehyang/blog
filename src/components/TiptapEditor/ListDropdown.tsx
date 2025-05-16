// src/components/TiptapEditor/ListDropdown.tsx
import { Editor } from "@tiptap/react";
import {
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import {
  FormatListBulleted,
  FormatListNumbered,
  ArrowDropDown,
} from "@mui/icons-material";

interface ListDropdownProps {
  editor: Editor;
  anchorEl: HTMLElement | null;
  onClick: (e: React.MouseEvent<HTMLElement>) => void;
  onClose: () => void;
}

export default function ListDropdown({
  editor,
  anchorEl,
  onClick,
  onClose,
}: ListDropdownProps) {
  return (
    <>
      <Tooltip title="List">
        <IconButton onClick={onClick}>
          <FormatListBulleted />
          <ArrowDropDown />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
        <MenuItem
          onClick={() => {
            editor.chain().focus().toggleBulletList().run();
            onClose();
          }}
        >
          <FormatListBulleted sx={{ mr: 1 }} />
          Bullet List
        </MenuItem>
        <MenuItem
          onClick={() => {
            editor.chain().focus().toggleOrderedList().run();
            onClose();
          }}
        >
          <FormatListNumbered sx={{ mr: 1 }} />
          Numbered List
        </MenuItem>
      </Menu>
    </>
  );
}
