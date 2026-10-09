"use client";

import Giscus from "@giscus/react";
import { useTheme } from "next-themes";

import { giscusConfig } from "@/config/giscus";

type GiscusCommentsProps = {
  postId: string;
};

export function GiscusComments({ postId }: GiscusCommentsProps) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";

  if (!giscusConfig.enabled) return null;

  return (
    <Giscus
      key={postId}
      repo={giscusConfig.repo}
      repoId={giscusConfig.repoId}
      {...(giscusConfig.category && giscusConfig.categoryId
        ? {
            category: giscusConfig.category,
            categoryId: giscusConfig.categoryId,
          }
        : {})}
      mapping="pathname"
      strict="1"
      reactionsEnabled="1"
      emitMetadata="0"
      inputPosition="top"
      theme={theme}
      lang="ko"
      loading="lazy"
    />
  );
}
