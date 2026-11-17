import "server-only";

import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
import { readLimitedResponseText } from "./limited-response";
import {
  sessionCookieOptions,
  writerConfigured,
  writerOrigin,
} from "./writer-auth";
import { writerDestination } from "./writer-navigation";

const OAUTH_SECONDS = 10 * 60;
export const OAUTH_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-blog-writer-oauth"
    : "blog-writer-oauth";
export const oauthCookieOptions = {
  ...sessionCookieOptions,
  // GitHub returns through a cross-site top-level GET.
  sameSite: "lax" as const,
  maxAge: OAUTH_SECONDS,
};
const flowSchema = z.object({
  state: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  verifier: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  next: z.string().max(512),
  expires: z.number().int(),
});

function sign(payload: string) {
  return createHmac("sha256", process.env.WRITE_SESSION_SECRET!)
    .update(
      `github-oauth:${process.env.WRITE_GITHUB_CLIENT_ID}:${process.env.WRITE_GITHUB_USER_ID}:${writerOrigin()}:${payload}`,
    )
    .digest("base64url");
}

function callbackUrl() {
  return `${writerOrigin()}/api/write/session/callback`;
}

export function createGitHubLogin(next: unknown, now = Date.now()) {
  if (!writerConfigured())
    throw new Error("Writer authentication is not configured");
  const flow = {
    state: randomBytes(32).toString("base64url"),
    verifier: randomBytes(32).toString("base64url"),
    next: writerDestination(next),
    expires: Math.floor(now / 1000) + OAUTH_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(flow)).toString("base64url");
  const url = new URL("https://github.com/login/oauth/authorize");
  url.search = new URLSearchParams({
    client_id: process.env.WRITE_GITHUB_CLIENT_ID!,
    redirect_uri: callbackUrl(),
    scope: "",
    state: flow.state,
    code_challenge: createHash("sha256")
      .update(flow.verifier)
      .digest("base64url"),
    code_challenge_method: "S256",
    allow_signup: "false",
  }).toString();
  return { url: url.href, cookie: `${payload}.${sign(payload)}` };
}

export function verifyGitHubFlow(
  cookie?: string,
  state?: string | null,
  now = Date.now(),
) {
  if (
    !writerConfigured() ||
    !cookie ||
    cookie.length > 2048 ||
    !state ||
    !/^[A-Za-z0-9_-]{43}$/.test(state)
  )
    return null;
  const match = /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{43})$/.exec(cookie);
  if (
    !match ||
    !timingSafeEqual(Buffer.from(match[2]), Buffer.from(sign(match[1])))
  )
    return null;
  try {
    const flow = flowSchema.parse(
      JSON.parse(Buffer.from(match[1], "base64url").toString("utf8")),
    );
    const seconds = Math.floor(now / 1000);
    if (
      flow.expires <= seconds ||
      flow.expires > seconds + OAUTH_SECONDS ||
      !timingSafeEqual(Buffer.from(flow.state), Buffer.from(state))
    )
      return null;
    return { ...flow, next: writerDestination(flow.next) };
  } catch {
    return null;
  }
}

export async function verifyGitHubOwner(code: string, verifier: string) {
  if (!writerConfigured() || !/^[A-Za-z0-9_-]{1,512}$/.test(code)) return false;
  const tokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.WRITE_GITHUB_CLIENT_ID!,
        client_secret: process.env.WRITE_GITHUB_CLIENT_SECRET!,
        code,
        code_verifier: verifier,
        redirect_uri: callbackUrl(),
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!tokenResponse.ok) {
    await tokenResponse.body?.cancel();
    return false;
  }
  const token = z
    .object({
      access_token: z.string().regex(/^[A-Za-z0-9_-]{1,2048}$/),
      token_type: z.literal("bearer"),
    })
    .safeParse(
      JSON.parse(await readLimitedResponseText(tokenResponse, 16_384)),
    );
  if (!token.success) return false;
  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token.data.access_token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "blog-writer",
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!userResponse.ok) {
    await userResponse.body?.cancel();
    return false;
  }
  const user = z
    .object({ id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER) })
    .safeParse(JSON.parse(await readLimitedResponseText(userResponse, 65_536)));
  return (
    user.success && String(user.data.id) === process.env.WRITE_GITHUB_USER_ID
  );
}
