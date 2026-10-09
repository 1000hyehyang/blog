import { scryptSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createWriterSession,
  verifyWriterSession,
  verifyWriterPassword,
  sameOrigin,
  allowLoginAttempt,
} from "./writer-auth";
import { PUT, DELETE } from "@/app/api/write/posts/[slug]/route";
import { POST as imageUpload } from "@/app/api/write/images/route";
import { POST as login, DELETE as logout } from "@/app/api/write/session/route";
const state = vi.hoisted(() => ({ cookie: "" }));
vi.mock("server-only", () => ({}));
vi.mock("@vercel/blob/client", () => ({
  handleUpload: async ({
    body,
    onBeforeGenerateToken,
  }: Parameters<typeof import("@vercel/blob/client").handleUpload>[0]) => {
    if (body.type !== "blob.generate-client-token")
      throw new Error("Unexpected callback");
    return onBeforeGenerateToken(
      body.payload.pathname,
      body.payload.clientPayload,
      body.payload.multipart,
    );
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: state.cookie }) }),
}));
vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
const password = "test-password-not-a-production-secret";
const salt = Buffer.alloc(16, 1);
const hash = `scrypt:${salt.toString("hex")}:${scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString("hex")}`;
beforeEach(() => {
  vi.stubEnv("WRITE_PASSWORD_HASH", hash);
  vi.stubEnv("WRITE_SESSION_SECRET", "a".repeat(40));
  vi.stubEnv("WRITE_ORIGIN", "https://blog.example");
  state.cookie = "";
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("writer trust boundaries", () => {
  it("accepts current post image folders while rejecting old and unsafe paths", async () => {
    state.cookie = createWriterSession();
    const id = "b4300eb9-7058-4f2b-82e0-857745ccc2a9";
    const request = (pathname: string) =>
      new Request("https://blog.example/api/write/images", {
        method: "POST",
        headers: {
          origin: "https://blog.example",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "blob.generate-client-token",
          payload: { pathname },
        }),
      });
    for (const path of [
      `posts/essay/${id}/${id}.webp`,
      `posts/art/post-id/${id}.png`,
    ]) {
      const response = await imageUpload(request(path));
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        maximumSizeInBytes: 20 * 1024 * 1024,
        addRandomSuffix: true,
      });
    }
    for (const path of [
      `posts/${id}.jpg`,
      `posts/../${id}/${id}.png`,
      `posts/essay/../${id}.png`,
      `posts/essay/a%2Fb/${id}.png`,
      `posts/essay/a\\b/${id}.png`,
      `posts/essay/${id}/${id}.svg`,
      `other/essay/${id}/${id}.png`,
    ])
      expect((await imageUpload(request(path))).status).toBe(400);
  });
  it("verifies scrypt and rejects forged, expired, malformed and rotated sessions", async () => {
    expect(await verifyWriterPassword(password)).toBe(true);
    expect(await verifyWriterPassword("incorrect")).toBe(false);
    const now = Date.now();
    const token = createWriterSession(now);
    expect(verifyWriterSession(token, now)).toBe(true);
    expect(verifyWriterSession(`${token.slice(0, -1)}!`, now)).toBe(false);
    expect(verifyWriterSession(token, now + 8 * 3600_000)).toBe(false);
    expect(verifyWriterSession("x".repeat(1000))).toBe(false);
    vi.stubEnv("WRITE_PASSWORD_HASH", "");
    expect(verifyWriterSession(token, now)).toBe(false);
  });
  it("denies all post mutations and image token requests before storage is called", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const context = { params: Promise.resolve({ slug: "post-a" }) };
    const request = (method: string, origin = "https://blog.example") =>
      new Request("https://blog.example/api/write/posts/post-a", {
        method,
        headers: { origin, "content-type": "application/json" },
        body: "{}",
      });
    expect((await PUT(request("PUT"), context)).status).toBe(401);
    expect((await DELETE(request("DELETE"), context)).status).toBe(401);
    expect(
      (
        await imageUpload(
          new Request("https://blog.example/api/write/images", {
            method: "POST",
            headers: {
              origin: "https://blog.example",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              type: "blob.generate-client-token",
              payload: { pathname: "posts/a.png" },
            }),
          }),
        )
      ).status,
    ).toBe(401);
    state.cookie = createWriterSession();
    expect(
      (await PUT(request("PUT", "https://attacker.example"), context)).status,
    ).toBe(403);
    expect(
      (await DELETE(request("DELETE", "https://attacker.example"), context))
        .status,
    ).toBe(403);
    expect(sameOrigin(new Request("https://blog.example"))).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("checks the request origin in development and the configured origin in production", () => {
    const request = new Request("http://localhost:3001/api/write/session", {
      method: "POST",
      headers: { origin: "http://localhost:3001" },
    });
    vi.stubEnv("WRITE_ORIGIN", "http://localhost:3000");
    vi.stubEnv("NODE_ENV", "development");
    expect(sameOrigin(request)).toBe(true);
    expect(
      sameOrigin(
        new Request(request.url, {
          headers: { host: "127.0.0.1:3100", origin: "http://127.0.0.1:3100" },
        }),
      ),
    ).toBe(true);
    expect(
      sameOrigin(
        new Request(request.url, {
          headers: { origin: "http://localhost:3000" },
        }),
      ),
    ).toBe(false);
    vi.stubEnv("NODE_ENV", "production");
    expect(sameOrigin(request)).toBe(false);
    expect(
      sameOrigin(
        new Request(request.url, {
          headers: { origin: "http://localhost:3000" },
        }),
      ),
    ).toBe(true);
    vi.stubEnv("NODE_ENV", "development");
    expect(
      sameOrigin(
        new Request(request.url, {
          headers: { origin: "http://attacker.example" },
        }),
      ),
    ).toBe(false);
    expect(sameOrigin(new Request(request.url))).toBe(false);
  });
  it("sets HttpOnly cookies only after password verification and clears them on logout", async () => {
    const request = (value: string) =>
      new Request("https://blog.example/api/write/session", {
        method: "POST",
        headers: {
          origin: "https://blog.example",
          "content-type": "application/json",
        },
        body: JSON.stringify({ password: value }),
      });
    const failure = await login(request("wrong"));
    expect(failure.status).toBe(401);
    expect(failure.headers.get("set-cookie")).toBeNull();
    const success = await login(request(password));
    expect(success.status).toBe(200);
    expect(success.headers.get("set-cookie")).toContain("HttpOnly");
    expect(success.headers.get("set-cookie")).toContain("SameSite=strict");
    const cleared = await logout(
      new Request("https://blog.example/api/write/session", {
        method: "DELETE",
        headers: { origin: "https://blog.example" },
      }),
    );
    expect(cleared.headers.get("set-cookie")).toContain("Max-Age=0");
  });
  it("throttles repeated attempts in each instance", () => {
    const now = Date.now() + 100_000;
    for (let i = 0; i < 5; i++) expect(allowLoginAttempt(now)).toBe(true);
    expect(allowLoginAttempt(now)).toBe(false);
    expect(allowLoginAttempt(now + 60_001)).toBe(true);
  });
});
