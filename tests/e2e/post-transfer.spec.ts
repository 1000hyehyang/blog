import { expect, test } from "@playwright/test";
import {
  POST_CHUNK_MAX_BYTES,
  POST_HTTP_MAX_BYTES,
} from "../../src/lib/post-transfer";
import {
  createTestSession,
  testSessionCookie,
  testSessionSecure,
} from "./writer-credentials";

test.beforeEach(async ({ page }) => {
  await page.context().addCookies([
    {
      name: testSessionCookie,
      secure: testSessionSecure,
      value: createTestSession(),
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  await page.goto("/");
});

test("accepts a maximally escaped chunk through the real HTTP handler", async ({
  page,
}) => {
  const result = await page.evaluate(async (chunkBytes) => {
    const body = JSON.stringify({ chunk: '\\"'.repeat(chunkBytes / 2) });
    const response = await fetch("/api/write/posts/transfer-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    return {
      bytes: new TextEncoder().encode(body).byteLength,
      status: response.status,
      data: await response.json(),
    };
  }, POST_CHUNK_MAX_BYTES);
  expect(result.bytes).toBeLessThanOrEqual(POST_HTTP_MAX_BYTES);
  // The fixture intentionally disables GitHub writes; reaching this check proves parsing succeeded.
  expect(result.status).toBe(503);
  expect(result.data.message).toContain("GitHub");
});

test("rejects requests above the HTTP budget without touching storage", async ({
  page,
}) => {
  const result = await page.evaluate(async (maximumBytes) => {
    const response = await fetch("/api/write/posts/transfer-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chunk: "x".repeat(maximumBytes) }),
    });
    return { status: response.status, data: await response.json() };
  }, POST_HTTP_MAX_BYTES);
  expect(result.status).toBe(400);
  expect(result.data.message).toContain("요청");
});
