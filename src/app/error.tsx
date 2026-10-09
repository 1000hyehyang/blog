"use client";

import ContentError from "@/components/layout/content-error";
import { SiteFrame } from "@/components/layout/site-frame";

export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <SiteFrame>
      <ContentError reset={reset} />
    </SiteFrame>
  );
}
