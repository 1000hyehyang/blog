import { expect, test } from "@playwright/test";

test("홈과 주요 탐색 UI를 표시한다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Dev Blog",
  );
  if (await page.getByRole("button", { name: "메뉴 열기" }).isVisible()) {
    await page.getByRole("button", { name: "메뉴 열기" }).click();
  }
  await expect(page.getByRole("link", { name: "검색" }).first()).toBeVisible();
});

test("검색 빈 상태를 표시한다", async ({ page }) => {
  await page.goto("/search");
  await expect(
    page.getByRole("heading", { name: "검색", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("검색어를 입력하세요")).toBeVisible();
});

test("다크 모드를 전환한다", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("theme", "light"));
  await page.goto("/");
  await page.getByRole("button", { name: "다크 모드로 전환" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("존재하지 않는 게시글은 404를 표시한다", async ({ page }) => {
  await page.goto("/posts/not-a-number");
  await expect(
    page.getByRole("heading", { name: "페이지를 찾을 수 없습니다" }),
  ).toBeVisible();
});
