import remarkGfm from "remark-gfm";

import { remarkUnderline } from "./markdown-underline";
import { remarkParagraphSpacing } from "./markdown-spacing";

export const markdownPlugins = [
  remarkGfm,
  remarkUnderline,
  remarkParagraphSpacing,
];
