// src/components/TiptapEditor/HeadingDropdown.tsx
import { Editor } from "@tiptap/react";
import {
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import { Title, ArrowDropDown } from "@mui/icons-material";

interface HeadingDropdownProps {
  editor: Editor;
  anchorEl: HTMLElement | null;
  onClick: (e: React.MouseEvent<HTMLElement>) => void;
  onClose: () => void;
}

export default function HeadingDropdown({
  editor,
  anchorEl,
  onClick,
  onClose,
}: HeadingDropdownProps) {
  const headingLevels = [1, 2, 3, 4] as const;

  return (
    <>
      <Tooltip title="Heading">
        <IconButton onClick={onClick}>
          <Title />
          <ArrowDropDown />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
        {headingLevels.map((level) => (
          <MenuItem
            key={level}
            onClick={() => {
              editor.chain().focus().toggleHeading({ level }).run();
              onClose();
            }}
          >
            Heading {level}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
