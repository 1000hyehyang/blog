import "server-only";

import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

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
const hashPattern = /^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/;

export function writerConfigured() {
  return (
    hashPattern.test(process.env.WRITE_PASSWORD_HASH ?? "") &&
    (process.env.WRITE_SESSION_SECRET?.length ?? 0) >= 32
  );
}
export function sameOrigin(request: Request) {
  const expected = process.env.WRITE_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL;
  if (!expected && process.env.NODE_ENV === "production") return false;
  try {
    return (
      request.headers.get("origin") === new URL(expected || request.url).origin
    );
  } catch {
    return false;
  }
}
function sign(value: string) {
  if (!writerConfigured()) return "";
  return createHmac("sha256", process.env.WRITE_SESSION_SECRET!)
    .update(`${process.env.WRITE_PASSWORD_HASH}:${value}`)
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

export async function verifyWriterPassword(password: string) {
  const match = hashPattern.exec(process.env.WRITE_PASSWORD_HASH ?? "");
  if (!writerConfigured() || !match || password.length > 1024) return false;
  const derived = await new Promise<Buffer>((resolve, reject) =>
    scrypt(
      password,
      Buffer.from(match[1], "hex"),
      64,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
  return timingSafeEqual(derived, Buffer.from(match[2], "hex"));
}

// ponytail: per-instance throttle; configure Vercel Firewall rate limiting for distributed login protection.
let attempts = 0;
let resetAt = 0;
export function allowLoginAttempt(now = Date.now()) {
  if (now >= resetAt) {
    attempts = 0;
    resetAt = now + 60_000;
  }
  return ++attempts <= 5;
}
