"use client";

import Giscus from "@giscus/react";
import { useTheme } from "next-themes";

import { giscusConfig } from "@/config/giscus";

type GiscusCommentsProps = {
  discussionNumber: number;
};

export function GiscusComments({ discussionNumber }: GiscusCommentsProps) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";

  if (!giscusConfig.enabled) {
    return (
      <p className="py-8 text-center text-sm text-tertiary">
        Giscus 환경 변수가 설정되지 않았습니다.{" "}
        <code className="text-secondary">NEXT_PUBLIC_GISCUS_*</code> 값을
        확인해 주세요.
      </p>
    );
  }

  return (
    <Giscus
      key={discussionNumber}
      repo={giscusConfig.repo}
      repoId={giscusConfig.repoId}
      {...(giscusConfig.category && giscusConfig.categoryId
        ? {
            category: giscusConfig.category,
            categoryId: giscusConfig.categoryId,
          }
        : {})}
      mapping="number"
      term={String(discussionNumber)}
      reactionsEnabled="1"
      emitMetadata="0"
      inputPosition="top"
      theme={theme}
      lang="ko"
    />
  );
}
