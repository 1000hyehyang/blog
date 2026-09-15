"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { LogOut, UserRound } from "lucide-react";
import { siteConfig } from "@/config/site";
import styles from "./writer.module.css";
import { IconButton } from "./icon-button";

export function WriterHeader({
  children,
  onLogout,
}: {
  children?: ReactNode;
  onLogout?: () => Promise<void>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    if (onLogout) return onLogout();
    setBusy(true);
    try {
      const response = await fetch("/api/write/session", { method: "DELETE" });
      if (!response.ok) throw new Error();
      router.replace("/login");
      router.refresh();
    } catch {
      setError("로그아웃하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <header className={styles.topbar}>
      <Link href="/manage" className={styles.brand}>
        {siteConfig.shortName}
        <span>STUDIO</span>
      </Link>
      {children && <div className={styles.toolbarSlot}>{children}</div>}
      <nav className={styles.account} aria-label="관리자 메뉴">
        <span className={styles.identity}>
          <UserRound size={16} aria-hidden="true" />
          {siteConfig.author.name}
        </span>
        <IconButton label="로그아웃" disabled={busy} onClick={logout}>
          <LogOut size={17} />
        </IconButton>
      </nav>
      {error && <p role="alert">{error}</p>}
    </header>
  );
}
