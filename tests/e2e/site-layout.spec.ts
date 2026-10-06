import { expect, test } from "@playwright/test";
import { createTestSession } from "./writer-credentials";

test("public routes and both 404 pages retain the blog frame", async ({
  page,
}, testInfo) => {
  for (const [name, path] of [
    ["home", "/"],
    ["posts", "/posts"],
    ["category", "/category/essay"],
    ["series", "/category/essay/series/life-updates"],
    ["search", "/search?q=e2e-no-results"],
    ["post", "/post-1"],
    ["post-not-found", "/not-a-post"],
    ["global-not-found", "/missing/nested/page"],
    ["category-not-found", "/category/missing"],
    ["posts-not-found", "/posts?cursor=missing"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.locator(".site-header-glass")).toHaveCount(1);
    await expect(
      page.getByRole("navigation", { name: "외부 링크" }),
    ).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("main")).toHaveCSS("padding-top", "68px");
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: testInfo.outputPath(`${name}.png`),
    });
  }
});

test("login, management and editing retain the writer frame", async ({
  page,
  baseURL,
}, testInfo) => {
  await page.goto("/login");
  await expect(page.getByLabel("비밀번호", { exact: true })).toBeVisible();
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("main")).toHaveCSS("padding-top", "0px");
  await expect(page.locator(".site-header-glass")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "외부 링크" })).toHaveCount(
    0,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: testInfo.outputPath("login.png"),
  });
  await page.context().addCookies([
    {
      name: "blog-writer",
      value: createTestSession(),
      url: baseURL ?? "http://127.0.0.1:3100",
    },
  ]);
  await page.goto("/manage");
  await expect(page.getByRole("heading", { name: /^글 관리/ })).toBeVisible();
  await page.getByRole("link", { name: "글쓰기", exact: true }).click();
  await expect(page).toHaveURL("/write");
  await expect(
    page.getByRole("textbox", { name: "본문 편집기" }),
  ).toBeVisible();
  for (const name of ["write", "manage"]) {
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("main")).toHaveCSS("padding-top", "0px");
    await expect(page.locator(".site-header-glass")).toHaveCount(0);
    await expect(
      page.getByRole("navigation", { name: "외부 링크" }),
    ).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: testInfo.outputPath(`${name}.png`),
    });
    if (name === "write") {
      await page.getByRole("link", { name: "Blog STUDIO" }).click();
      await expect(page).toHaveURL("/manage");
      await expect(
        page.getByRole("heading", { name: /^글 관리/ }),
      ).toBeVisible();
    }
  }
  await page.goto("/write?slug=missing");
  await expect(
    page.getByRole("heading", { name: "페이지를 찾을 수 없습니다" }),
  ).toBeVisible();
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("main")).toHaveCSS("padding-top", "0px");
  await expect(page.locator(".site-header-glass")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "외부 링크" })).toHaveCount(
    0,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: testInfo.outputPath("writer-not-found.png"),
  });
});
