import { expect, test } from "@playwright/test";

test("홈과 주요 탐색 UI를 표시한다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Dev Blog",
  );
  if (await page.getByRole("button", { name: "메뉴 열기" }).isVisible()) {
    await page.getByRole("button", { name: "메뉴 열기" }).click();
  }
  await expect(page.getByRole("searchbox").first()).toBeVisible();
});

test("헤더 검색창에서 엔터 시 검색 페이지로 이동한다", async ({ page }) => {
  await page.goto("/");
  const searchbox = page.getByRole("searchbox").first();
  await searchbox.fill("test");
  await searchbox.press("Enter");
  await expect(page).toHaveURL(/\/search(\?q=test|\/\?q=test)/);
  await expect(page.getByText(/test/)).toBeVisible();
});

test("다크 모드를 전환한다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "다크 모드로 전환" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(
    page.getByRole("button", { name: "라이트 모드로 전환" }),
  ).toBeVisible();
});

test("존재하지 않는 포스트는 404를 표시한다", async ({ page }) => {
  await page.goto("/posts/not-a-number");
  await expect(
    page.getByRole("heading", { name: "페이지를 찾을 수 없습니다" }),
  ).toBeVisible();
});
