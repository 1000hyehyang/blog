import { createHmac, scryptSync } from "node:crypto";

export const testPassword = "731204!";
export const testSessionSecret = "e2e-only-session-secret-not-for-deployment";
const salt = Buffer.alloc(16, 2);
export const testHash = `scrypt:${salt.toString("hex")}:${scryptSync(testPassword, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString("hex")}`;

export function createTestSession(now = Date.now()) {
  const payload = `${Math.floor(now / 1000) + 8 * 60 * 60}.${"0".repeat(32)}`;
  const signature = createHmac("sha256", testSessionSecret)
    .update(`${testHash}:${payload}`)
    .digest("base64url");
  return `${payload}.${signature}`;
}
