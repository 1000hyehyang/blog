import { randomBytes, randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { testClientId, testGitHubUserId } from "./writer-credentials";

export async function mockGitHubAuthorization(
  page: Page,
  userId = testGitHubUserId,
  denied = false,
) {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `2001:db8:${randomBytes(12).toString("hex").match(/.{4}/g)!.join(":")}`,
  });
  await page.route(
    "https://github.com/login/oauth/authorize?**",
    async (route) => {
      const authorization = new URL(route.request().url());
      expect(authorization.searchParams.get("client_id")).toBe(testClientId);
      expect(authorization.searchParams.get("code_challenge_method")).toBe(
        "S256",
      );
      expect(authorization.searchParams.get("scope")).toBe("");
      const callback = new URL(authorization.searchParams.get("redirect_uri")!);
      expect(callback.href).toBe(
        "http://127.0.0.1:3100/api/write/session/callback",
      );
      callback.searchParams.set(
        "state",
        authorization.searchParams.get("state")!,
      );
      if (denied) callback.searchParams.set("error", "access_denied");
      else
        callback.searchParams.set(
          "code",
          Buffer.from(
            JSON.stringify({
              id: Number(userId),
              challenge: authorization.searchParams.get("code_challenge"),
              nonce: randomUUID(),
            }),
          ).toString("base64url"),
        );
      await route.fulfill({
        status: 302,
        headers: { location: callback.href },
      });
    },
  );
}
