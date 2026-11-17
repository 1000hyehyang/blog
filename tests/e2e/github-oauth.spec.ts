import { expect, test } from "@playwright/test";
import { mockGitHubAuthorization } from "./github-login";
import { testSessionCookie, testSessionSecure } from "./writer-credentials";

test("OAuth returns to drafts, creates only the owner session and keeps logout effective", async ({
  page,
}) => {
  await mockGitHubAuthorization(page);
  await page.goto("/manage?tab=drafts");
  await page.getByRole("button", { name: "GitHub로 로그인" }).click();
  await expect(page).toHaveURL("/manage?tab=drafts");
  const cookies = await page.context().cookies();
  expect(
    cookies.find((cookie) => cookie.name === testSessionCookie),
  ).toMatchObject({
    httpOnly: true,
    sameSite: "Strict",
    secure: testSessionSecure,
  });
  expect(cookies.some((cookie) => cookie.name.endsWith("writer-oauth"))).toBe(
    false,
  );
  await page.getByRole("link", { name: "글쓰기", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "본문 편집기" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL("/login");
  await page.goto("/manage");
  await expect(page).toHaveURL(/\/login\?next=/);
});

for (const scenario of ["wrong-owner", "cancelled"] as const) {
  test(`OAuth ${scenario} cannot reach the editor and can retry`, async ({
    page,
  }) => {
    await mockGitHubAuthorization(page, "67890", scenario === "cancelled");
    await page.goto("/write?slug=post-1");
    await page.getByRole("button", { name: "GitHub로 로그인" }).click();
    await expect(page.locator("#login-error")).toContainText(
      "GitHub 로그인을 완료하지 못했습니다.",
    );
    expect(new URL(page.url()).searchParams.get("next")).toBe(
      "/write?slug=post-1",
    );
    expect(
      (await page.context().cookies()).some(
        (cookie) => cookie.name === testSessionCookie,
      ),
    ).toBe(false);
    await page.unroute("https://github.com/login/oauth/authorize?**");
    await mockGitHubAuthorization(page);
    await page.getByRole("button", { name: "GitHub로 로그인" }).click();
    await expect(page).toHaveURL("/write?slug=post-1");
    await expect(page.getByRole("heading", { name: "글 수정" })).toBeAttached();
  });
}
