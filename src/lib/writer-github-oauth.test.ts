import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST, DELETE } from "@/app/api/write/session/route";
import { GET } from "@/app/api/write/session/callback/route";
import {
  SESSION_COOKIE,
  verifyWriterSession,
  writerConfigured,
  writerOrigin,
} from "./writer-auth";
import {
  createGitHubLogin,
  OAUTH_COOKIE,
  verifyGitHubFlow,
} from "./writer-github-oauth";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
let address = 0;
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv("WRITE_GITHUB_CLIENT_ID", "test-client");
  vi.stubEnv("WRITE_GITHUB_CLIENT_SECRET", "test-client-secret");
  vi.stubEnv("WRITE_GITHUB_USER_ID", "12345");
  vi.stubEnv("WRITE_SESSION_SECRET", "s".repeat(40));
  vi.stubEnv("WRITE_ORIGIN", "https://blog.example");
  vi.stubEnv("WRITE_TRUST_PROXY", "1");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function startRequest(
  body: unknown = { next: "/write?slug=post-1" },
  origin = "https://blog.example",
) {
  return new Request("https://blog.example/api/write/session", {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      "x-forwarded-for": `192.0.2.${++address}`,
    },
    body: JSON.stringify(body),
  });
}
function callback(
  login: ReturnType<typeof createGitHubLogin>,
  params: Record<string, string> = {},
) {
  const url = new URL("https://blog.example/api/write/session/callback");
  url.search = new URLSearchParams({
    state: new URL(login.url).searchParams.get("state")!,
    code: "one-time-code",
    ...params,
  }).toString();
  return new NextRequest(url, {
    headers: { cookie: `${OAUTH_COOKIE}=${login.cookie}` },
  });
}
function owner(id: unknown = 12345) {
  fetchMock
    .mockResolvedValueOnce(
      Response.json({ access_token: "github-token", token_type: "bearer" }),
    )
    .mockResolvedValueOnce(
      Response.json({ id, login: "a-name-is-not-an-identity" }),
    );
}
function expectNoSession(response: Awaited<ReturnType<typeof GET>>) {
  expect(response.cookies.get(SESSION_COOKIE)).toBeUndefined();
  expect(response.cookies.get(OAUTH_COOKIE)?.maxAge).toBe(0);
  expect(response.headers.get("cache-control")).toBe("no-store");
}

describe("GitHub writer OAuth", () => {
  it("starts with a signed browser cookie, random state and S256 PKCE, without issuing a session", async () => {
    const response = await POST(startRequest());
    expect(response.status).toBe(200);
    const { url } = await response.json();
    const authorization = new URL(url);
    expect(authorization.origin + authorization.pathname).toBe(
      "https://github.com/login/oauth/authorize",
    );
    expect(Object.fromEntries(authorization.searchParams)).toMatchObject({
      client_id: "test-client",
      redirect_uri: "https://blog.example/api/write/session/callback",
      scope: "",
      code_challenge_method: "S256",
      allow_signup: "false",
    });
    const cookie = response.cookies.get(OAUTH_COOKIE)!;
    expect(cookie).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    const flow = verifyGitHubFlow(
      cookie.value,
      authorization.searchParams.get("state"),
    )!;
    expect(flow.next).toBe("/write?slug=post-1");
    expect(authorization.searchParams.get("code_challenge")).toBe(
      createHash("sha256").update(flow.verifier).digest("base64url"),
    );
    expect(url).not.toContain(flow.verifier);
    expect(url).not.toContain("test-client-secret");
    expect(response.cookies.get(SESSION_COOKIE)).toBeUndefined();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(createGitHubLogin("/write").cookie).not.toBe(cookie.value);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("denies foreign origins, password requests, malformed input, missing configuration and excessive starts", async () => {
    expect(
      (await POST(startRequest({}, "https://attacker.example"))).status,
    ).toBe(403);
    expect((await POST(startRequest({}, ""))).status).toBe(403);
    for (const body of [
      { password: "old-password" },
      {},
      { next: [] },
      { next: "x".repeat(513) },
      null,
    ]) {
      const response = await POST(startRequest(body));
      expect(response.status).toBe(400);
      expect(response.headers.get("set-cookie")).toBeNull();
    }
    const request = startRequest();
    for (let i = 0; i < 5; i++)
      expect((await POST(request.clone())).status).toBe(200);
    const limited = await POST(request.clone());
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("60");
    vi.stubEnv("WRITE_GITHUB_CLIENT_SECRET", "");
    expect((await POST(startRequest())).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires a canonical secure origin and a numeric owner ID, with loopback HTTP for local development", () => {
    expect(writerConfigured()).toBe(true);
    for (const origin of [
      "http://blog.example",
      "https://name:secret@blog.example",
      "https://blog.example/path",
      "https://blog.example?x=1",
      "https://blog.example#x",
      "invalid",
    ]) {
      vi.stubEnv("WRITE_ORIGIN", origin);
      expect(writerConfigured()).toBe(false);
    }
    for (const origin of [
      "http://localhost:3000",
      "http://127.0.0.1:3100",
      "https://blog.example/",
    ]) {
      vi.stubEnv("WRITE_ORIGIN", origin);
      expect(writerConfigured()).toBe(true);
      expect(writerOrigin()).toBe(new URL(origin).origin);
    }
    for (const id of [
      "",
      "owner-name",
      "0",
      "-1",
      "00123",
      "9007199254740992",
    ]) {
      vi.stubEnv("WRITE_GITHUB_USER_ID", id);
      expect(writerConfigured()).toBe(false);
    }
  });

  it("rejects tampering, mismatched browsers, expiry, future dates and configuration rotation", () => {
    const now = Date.now();
    const login = createGitHubLogin("/write", now);
    const state = new URL(login.url).searchParams.get("state")!;
    expect(verifyGitHubFlow(login.cookie, state, now)).not.toBeNull();
    for (const cookie of [
      undefined,
      "",
      "x".repeat(3000),
      `${login.cookie.slice(0, -1)}!`,
      createGitHubLogin("/write").cookie,
    ])
      expect(verifyGitHubFlow(cookie, state, now)).toBeNull();
    for (const value of [undefined, "bad", "x".repeat(43)])
      expect(verifyGitHubFlow(login.cookie, value, now)).toBeNull();
    expect(verifyGitHubFlow(login.cookie, state, now + 600_000)).toBeNull();
    expect(verifyGitHubFlow(login.cookie, state, now - 1000)).toBeNull();
    vi.stubEnv("WRITE_SESSION_SECRET", "z".repeat(40));
    expect(verifyGitHubFlow(login.cookie, state, now)).toBeNull();
  });

  it("verifies the owner on GitHub, keeps tokens server-side and preserves the edit destination and Strict session", async () => {
    const response = await POST(startRequest());
    const login = {
      ...(await response.json()),
      cookie: response.cookies.get(OAUTH_COOKIE)!.value,
    };
    owner();
    const result = await GET(callback(login));
    expect(result.status).toBe(200);
    const session = result.cookies.get(SESSION_COOKIE)!;
    expect(verifyWriterSession(session.value)).toBe(true);
    expect(session).toMatchObject({
      httpOnly: true,
      sameSite: "strict",
      maxAge: 8 * 60 * 60,
      path: "/",
    });
    expect(result.cookies.get(OAUTH_COOKIE)?.maxAge).toBe(0);
    const html = await result.text();
    expect(html).toContain('content="0;url=/write?slug=post-1"');
    expect(html).not.toContain("github-token");
    expect(result.headers.get("set-cookie")).not.toContain("github-token");
    expect(result.headers.get("referrer-policy")).toBe("no-referrer");
    expect(result.headers.get("content-security-policy")).toContain(
      "default-src 'none'",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [tokenUrl, tokenOptions] = fetchMock.mock.calls[0];
    expect(tokenUrl).toBe("https://github.com/login/oauth/access_token");
    expect(tokenOptions).toMatchObject({
      method: "POST",
      cache: "no-store",
      redirect: "error",
    });
    expect(Object.fromEntries(tokenOptions.body)).toMatchObject({
      client_id: "test-client",
      client_secret: "test-client-secret",
      code: "one-time-code",
      redirect_uri: "https://blog.example/api/write/session/callback",
    });
    const verifier = tokenOptions.body.get("code_verifier");
    expect(createHash("sha256").update(verifier).digest("base64url")).toBe(
      new URL(login.url).searchParams.get("code_challenge"),
    );
    expect(fetchMock.mock.calls[1]).toEqual([
      "https://api.github.com/user",
      expect.objectContaining({
        cache: "no-store",
        redirect: "error",
        headers: expect.objectContaining({
          Authorization: "Bearer github-token",
        }),
      }),
    ]);
  });

  it.each([67890, "12345", undefined, -1, 1.5])(
    "never grants a session for an unapproved or malformed user ID (%s)",
    async (id) => {
      owner(id);
      // An omitted id must not pick the fixture helper's default.
      if (id === undefined)
        fetchMock
          .mockReset()
          .mockResolvedValueOnce(
            Response.json({
              access_token: "github-token",
              token_type: "bearer",
            }),
          )
          .mockResolvedValueOnce(Response.json({ login: "12345" }));
      const result = await GET(
        callback(createGitHubLogin("/write?slug=post-1")),
      );
      expectNoSession(result);
      expect(result.status).toBe(303);
      const url = new URL(result.headers.get("location")!);
      expect(url.origin).toBe("https://blog.example");
      expect(url.searchParams.get("next")).toBe("/write?slug=post-1");
    },
  );

  it("fails closed on callback cancellation, invalid state, missing code, missing cookies and duplicate parameters", async () => {
    const login = createGitHubLogin("/write");
    const requests = [
      callback(login, { error: "access_denied" }),
      callback(login, { state: "x".repeat(43) }),
      callback(login, { code: "" }),
      new NextRequest(callback(login).url),
    ];
    for (const parameter of ["code", "state"]) {
      const request = callback(login);
      request.nextUrl.searchParams.append(parameter, "duplicate");
      requests.push(request);
    }
    for (const request of requests) expectNoSession(await GET(request));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never redirects to user-supplied external URLs or reflects provider errors", async () => {
    for (const next of [
      "https://attacker.example",
      "//attacker.example",
      '/write?slug=\"<script>',
      "/write?slug=a&next=//attacker.example",
    ]) {
      const login = createGitHubLogin(next);
      owner();
      const result = await GET(callback(login));
      expect(await result.text()).toContain('content="0;url=/manage"');
    }
    const result = await GET(
      callback(createGitHubLogin("/write"), {
        error: "<script>secret</script>",
        error_description: "client-secret",
      }),
    );
    expect(result.headers.get("location")).not.toContain("secret");
    expect(await result.text()).not.toContain("secret");
  });

  it.each([
    "http",
    "json",
    "oversized",
    "oauth-error",
    "token-type",
    "timeout",
    "user-http",
    "user-json",
    "user-oversized",
  ])("issues no session when GitHub fails (%s)", async (failure) => {
    if (failure.startsWith("user-"))
      fetchMock.mockResolvedValueOnce(
        Response.json({ access_token: "github-token", token_type: "bearer" }),
      );
    if (failure.endsWith("http"))
      fetchMock.mockResolvedValueOnce(
        new Response("unavailable", { status: 503 }),
      );
    else if (failure.endsWith("json"))
      fetchMock.mockResolvedValueOnce(new Response("not JSON"));
    else if (failure.endsWith("oversized"))
      fetchMock.mockResolvedValueOnce(new Response("x".repeat(70_000)));
    else if (failure === "oauth-error")
      fetchMock.mockResolvedValueOnce(
        Response.json({ error: "bad_verification_code" }),
      );
    else if (failure === "token-type")
      fetchMock.mockResolvedValueOnce(
        Response.json({
          access_token: "github-token",
          token_type: "unexpected",
        }),
      );
    else
      fetchMock.mockRejectedValueOnce(
        new Error("timeout with sensitive provider details"),
      );
    const result = await GET(callback(createGitHubLogin("/manage")));
    expectNoSession(result);
    expect(result.status).toBe(303);
    expect(await result.text()).not.toContain("sensitive");
  });

  it("cannot issue a new session by replaying a provider-consumed authorization code", async () => {
    const login = createGitHubLogin("/manage");
    owner();
    expect(
      (await GET(callback(login))).cookies.get(SESSION_COOKIE),
    ).toBeDefined();
    fetchMock.mockResolvedValueOnce(
      Response.json({ error: "bad_verification_code" }),
    );
    expectNoSession(await GET(callback(login)));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expectNoSession(await GET(new NextRequest(callback(login).url)));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("clears pending OAuth on logout and refuses a forged logout", async () => {
    const denied = await DELETE(
      new Request("https://blog.example/api/write/session", {
        method: "DELETE",
        headers: { origin: "https://attacker.example" },
      }),
    );
    expect(denied.status).toBe(403);
    expect(denied.headers.get("set-cookie")).toBeNull();
    const response = await DELETE(
      new Request("https://blog.example/api/write/session", {
        method: "DELETE",
        headers: { origin: "https://blog.example" },
      }),
    );
    expect(response.cookies.get(OAUTH_COOKIE)?.maxAge).toBe(0);
    expect(response.cookies.get(SESSION_COOKIE)?.maxAge).toBe(0);
  });

  it("uses Secure host-only cookies in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const auth = await import("./writer-auth");
    const oauth = await import("./writer-github-oauth");
    expect(auth.SESSION_COOKIE).toBe("__Host-blog-writer");
    expect(oauth.OAUTH_COOKIE).toBe("__Host-blog-writer-oauth");
    expect(auth.sessionCookieOptions).toMatchObject({
      secure: true,
      httpOnly: true,
      sameSite: "strict",
      path: "/",
    });
    expect(oauth.oauthCookieOptions).toMatchObject({
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    expect(auth.sessionCookieOptions).not.toHaveProperty("domain");
  });
});
