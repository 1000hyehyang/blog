import { createHmac } from "node:crypto";

export const testClientId = "e2e-client";
export const testClientSecret = "e2e-client-secret";
export const testGitHubUserId = "12345";
export const testSessionSecret = "e2e-only-session-secret-not-for-deployment";
export const testSessionCookie =
  process.env.BLOG_E2E_PRODUCTION === "1"
    ? "__Host-blog-writer"
    : "blog-writer";
export const testSessionSecure = process.env.BLOG_E2E_PRODUCTION === "1";

export function createTestSession(now = Date.now()) {
  const payload = `${Math.floor(now / 1000) + 8 * 60 * 60}.${"0".repeat(32)}`;
  const signature = createHmac("sha256", testSessionSecret)
    .update(`github:${testClientId}:${testGitHubUserId}:${payload}`)
    .digest("base64url");
  return `${payload}.${signature}`;
}
