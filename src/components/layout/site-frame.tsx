"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function SiteFrame({
  children,
  header,
  footer,
}: {
  children: ReactNode;
  header: ReactNode;
  footer: ReactNode;
}) {
  const pathname = usePathname();
  if (["/write", "/manage", "/login"].includes(pathname))
    return <main className="flex-1">{children}</main>;
  return (
    <>
      {header}
      <main className="flex-1 pt-[var(--header-height)]">{children}</main>
      {footer}
    </>
  );
}
