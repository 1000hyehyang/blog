import remarkGfm from "remark-gfm";

import { remarkUnderline } from "./markdown-underline";
import { remarkHeadingIds } from "./markdown-headings";

export const markdownPlugins = [remarkGfm, remarkUnderline, remarkHeadingIds];
