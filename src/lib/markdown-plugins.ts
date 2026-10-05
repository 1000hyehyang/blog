import remarkGfm from "remark-gfm";

import { remarkUnderline } from "./markdown-underline";
import { remarkParagraphSpacing } from "./markdown-spacing";
import { remarkHeadingIds } from "./markdown-headings";

export const markdownPlugins = [
  remarkGfm,
  remarkUnderline,
  remarkParagraphSpacing,
  remarkHeadingIds,
];
