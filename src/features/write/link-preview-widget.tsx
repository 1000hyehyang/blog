"use client";

import { Extension } from "@tiptap/core";
import { ReactWidgetRenderer } from "@tiptap/react";
import { useEffect, useState } from "react";

import {
  LinkPreviewCard,
  type LinkPreviewCardData,
} from "@/features/post/link-preview-card";
import { parseExternalHttpUrl } from "@/lib/link-preview";

function LinkPreviewWidget({ url }: { url: string }) {
  const parsed = new URL(url);
  const [preview, setPreview] = useState<LinkPreviewCardData>({
    url,
    hostname: parsed.hostname,
    title: parsed.hostname,
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/write/link-preview?${new URLSearchParams({ url })}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: LinkPreviewCardData | null) => {
        if (data && !controller.signal.aborted) setPreview(data);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [url]);

  return <LinkPreviewCard preview={preview} />;
}

export const LinkPreviewExtension = Extension.create({
  name: "linkPreviewWidget",
  addDecorations() {
    return {
      create: ({ editor, state }) => {
        const widgets: ReturnType<typeof ReactWidgetRenderer>[] = [];
        state.doc.descendants((node, pos) => {
          if (node.type.name !== "paragraph" || node.childCount !== 1) return;
          const text = node.firstChild;
          if (!text?.isText) return;
          const url = parseExternalHttpUrl(text.textContent.trim());
          if (!url) return;
          const href = text.marks.find((mark) => mark.type.name === "link")
            ?.attrs.href;
          if (href && parseExternalHttpUrl(href)?.href !== url.href) return;
          widgets.push(
            ReactWidgetRenderer(LinkPreviewWidget, {
              editor,
              pos: pos + node.nodeSize - 1,
              key: `${pos}:${url.href}`,
              props: { url: url.href },
              className: "prose link-preview-widget",
              side: 1,
              stopEvent: () => true,
              ignoreSelection: true,
            }),
          );
        });
        return widgets;
      },
    };
  },
});
