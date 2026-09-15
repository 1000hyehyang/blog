"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { siteConfig } from "@/config/site";
import styles from "./writer.module.css";

export function WriterLogin({
  configured,
  destination,
}: {
  configured: boolean;
  destination: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [focused, setFocused] = useState(false);
  const pending = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (configured) input.current?.focus();
  }, [configured]);
  async function login(value: string) {
    if (pending.current || value.length !== 7) return;
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/write/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setPassword("");
      router.replace(destination);
      router.refresh();
    } catch (error) {
      setPassword("");
      setMessage(
        error instanceof Error ? error.message : "로그인에 실패했습니다.",
      );
      setBusy(false);
      requestAnimationFrame(() => input.current?.focus());
    } finally {
      pending.current = false;
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
            void login(password);
          }}
        >
          <div className={styles.otp}>
            <input
              ref={input}
              name="password"
              type="password"
              aria-label="비밀번호"
              aria-describedby="login-error"
              autoFocus
              autoComplete="current-password"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={7}
              required
              disabled={!configured || busy}
              value={password}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChange={(event) => {
                const value = event.target.value;
                setPassword(value);
                setMessage("");
                if (value.length === 7) void login(value);
              }}
            />
            <div className={styles.otpSlots} aria-hidden="true">
              {Array.from({ length: 7 }, (_, index) => (
                <span
                  key={index}
                  data-active={
                    focused && Math.min(password.length, 6) === index
                  }
                  data-filled={index < password.length}
                >
                  {index < password.length ? "•" : ""}
                </span>
              ))}
            </div>
          </div>
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
