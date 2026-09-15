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
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: state.cookie }) }),
}));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
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
