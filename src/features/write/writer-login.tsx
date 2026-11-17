"use client";
import { useEffect, useRef, useState } from "react";
import { siteConfig } from "@/config/site";
import { useHydrated } from "@/lib/react/use-hydrated";
import styles from "./writer.module.css";

export function WriterLogin({
  configured,
  destination,
  failed = false,
}: {
  configured: boolean;
  destination: string;
  failed?: boolean;
}) {
  const hydrated = useHydrated();
  const [message, setMessage] = useState(
    failed
      ? "GitHub 로그인을 완료하지 못했습니다. 허용된 계정으로 다시 시도해 주세요."
      : "",
  );
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (configured && hydrated) button.current?.focus();
    function restore() {
      pending.current = false;
      setBusy(false);
    }
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, [configured, hydrated]);
  async function login() {
    if (!configured || pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/write/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ next: destination }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "로그인에 실패했습니다.");
      const url = new URL(data.url);
      if (
        url.origin !== "https://github.com" ||
        url.pathname !== "/login/oauth/authorize"
      )
        throw new Error("로그인에 실패했습니다.");
      window.location.assign(url.href);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "로그인에 실패했습니다.",
      );
      setBusy(false);
      pending.current = false;
      requestAnimationFrame(() => button.current?.focus());
    }
  }
  return (
    <div className={`${styles.writer} ${styles.loginPage}`}>
      <div className={styles.login}>
        <h1 className={styles.loginBrand}>
          {siteConfig.shortName} <span>STUDIO</span>
        </h1>
        <form
          method="post"
          action="/api/write/session"
          onSubmit={(event) => {
            event.preventDefault();
            void login();
          }}
        >
          <button
            ref={button}
            type="submit"
            className={styles.githubLogin}
            aria-describedby="login-error"
            aria-busy={busy}
            autoFocus
            disabled={!configured || !hydrated || busy}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M6.766 11.328c-2.063-.25-3.516-1.734-3.516-3.656 0-.781.281-1.625.75-2.188-.203-.515-.172-1.609.063-2.062.625-.078 1.468.25 1.968.703.594-.187 1.219-.281 1.985-.281.765 0 1.39.094 1.953.265.484-.437 1.344-.765 1.969-.687.218.422.25 1.515.046 2.047.5.593.766 1.39.766 2.203 0 1.922-1.453 3.375-3.547 3.64.531.344.89 1.094.89 1.954v1.625c0 .468.391.734.86.547C13.781 14.359 16 11.53 16 8.03 16 3.61 12.406 0 7.984 0 3.563 0 0 3.61 0 8.031a7.88 7.88 0 0 0 5.172 7.422c.422.156.828-.125.828-.547v-1.25c-.219.094-.5.156-.75.156-1.031 0-1.64-.562-2.078-1.609-.172-.422-.36-.672-.719-.719-.187-.015-.25-.093-.25-.187 0-.188.313-.328.625-.328.453 0 .844.281 1.25.86.313.452.64.655 1.031.655s.641-.14 1-.5c.266-.265.47-.5.657-.656" />
            </svg>
            {busy ? "GitHub로 이동 중…" : "GitHub로 로그인"}
          </button>
          <div className={styles.loginStatus}>
            <p id="login-error" role="alert">
              {configured ? message : "관리자 인증이 설정되지 않았습니다."}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
