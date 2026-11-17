import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isIP } from "node:net";

const SESSION_SECONDS = 8 * 60 * 60;
export const SESSION_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-blog-writer" : "blog-writer";
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: SESSION_SECONDS,
};

export function writerOrigin() {
  try {
    const url = new URL(
      process.env.WRITE_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || "",
    );
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/" ||
      (url.protocol !== "https:" &&
        !(
          url.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
        ))
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function writerConfigured() {
  return (
    Boolean(process.env.WRITE_GITHUB_CLIENT_ID?.trim()) &&
    Boolean(process.env.WRITE_GITHUB_CLIENT_SECRET?.trim()) &&
    /^[1-9]\d{0,15}$/.test(process.env.WRITE_GITHUB_USER_ID ?? "") &&
    Number.isSafeInteger(Number(process.env.WRITE_GITHUB_USER_ID)) &&
    Boolean(writerOrigin()) &&
    (process.env.WRITE_SESSION_SECRET?.length ?? 0) >= 32
  );
}
export function sameOrigin(request: Request) {
  const url = new URL(request.url);
  const expected =
    process.env.NODE_ENV === "production"
      ? process.env.WRITE_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL
      : `${url.protocol}//${request.headers.get("host") || url.host}`;
  if (!expected) return false;
  try {
    return request.headers.get("origin") === new URL(expected).origin;
  } catch {
    return false;
  }
}
function sign(value: string) {
  if (!writerConfigured()) return "";
  return createHmac("sha256", process.env.WRITE_SESSION_SECRET!)
    .update(
      `github:${process.env.WRITE_GITHUB_CLIENT_ID}:${process.env.WRITE_GITHUB_USER_ID}:${value}`,
    )
    .digest("base64url");
}
export function createWriterSession(now = Date.now()) {
  if (!writerConfigured())
    throw new Error("Writer authentication is not configured");
  const payload = `${Math.floor(now / 1000) + SESSION_SECONDS}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${sign(payload)}`;
}
export function verifyWriterSession(token?: string, now = Date.now()) {
  if (!writerConfigured() || !token || token.length > 160) return false;
  const match = /^(\d{10})\.([a-f0-9]{32})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return false;
  const expires = Number(match[1]);
  const seconds = Math.floor(now / 1000);
  if (expires <= seconds || expires > seconds + SESSION_SECONDS) return false;
  return timingSafeEqual(
    Buffer.from(match[3]),
    Buffer.from(sign(`${match[1]}.${match[2]}`)),
  );
}
export async function isWriter() {
  return verifyWriterSession((await cookies()).get(SESSION_COOKIE)?.value);
}

const attempts = new Map<string, { count: number; resetAt: number }>();
export function allowLoginAttempt(request: Request, now = Date.now()) {
  const trustedProxy =
    process.env.VERCEL === "1" || process.env.WRITE_TRUST_PROXY === "1";
  const address = trustedProxy
    ? request.headers.get("x-forwarded-for")?.trim()
    : "127.0.0.1";
  if (!address || address.includes("%") || !isIP(address)) return false;
  const key = address.includes(":")
    ? new URL(`http://[${address}]`).hostname
    : address;
  let attempt = attempts.get(key);
  if (!attempt || now >= attempt.resetAt) {
    if (attempts.size >= 10_000) {
      for (const [ip, value] of attempts)
        if (now >= value.resetAt) attempts.delete(ip);
      if (!attempts.has(key) && attempts.size >= 10_000) return false;
    }
    attempt = { count: 0, resetAt: now + 60_000 };
    attempts.set(key, attempt);
  }
  return ++attempt.count <= 5;
}
