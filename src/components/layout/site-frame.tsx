import { Suspense, type ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <SiteHeader />
      </Suspense>
      <main className="flex-1 pt-[var(--header-height)]">{children}</main>
      <SiteFooter />
    </>
  );
}
