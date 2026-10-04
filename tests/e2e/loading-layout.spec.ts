import { expect, test, type Locator } from "@playwright/test";
import { createTestSession } from "./writer-credentials";

async function expectSameBox(placeholder: Locator, content: Locator) {
  const before = await placeholder.boundingBox();
  const after = await content.boundingBox();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  for (const key of ["x", "y", "width", "height"] as const)
    expect(
      Math.abs(before![key] - after![key]),
      `${placeholder}: ${key}`,
    ).toBeLessThan(1);
}

test("writer skeleton matches the loaded editor layout", async ({
  browser,
  page,
  baseURL,
  isMobile,
}, testInfo) => {
  const loadingContext = await browser.newContext({
    javaScriptEnabled: false,
    viewport: page.viewportSize(),
    isMobile,
  });
  try {
    const cookies = [
      {
        name: "blog-writer",
        value: createTestSession(),
        url: baseURL!,
      },
    ];
    await loadingContext.addCookies(cookies);
    await page.context().addCookies(cookies);
    const loadingPage = await loadingContext.newPage();
    await loadingPage.goto(`${baseURL}/write`);
    const skeleton = loadingPage.getByLabel("글쓰기 화면 불러오는 중");
    await expect(skeleton).toBeVisible();
    await page.goto("/write");
    await expect(
      page.getByRole("textbox", { name: "본문 편집기" }),
    ).toBeVisible();
    await Promise.all([
      loadingPage.evaluate(() => document.fonts.ready),
      page.evaluate(() => document.fonts.ready),
    ]);
    for (const selector of [
      "header",
      '[class*="toolbarSlot"]',
      '[class*="categorySelectors"]',
      '[class*="titleField"]',
      '[class*="editorPlaceholder"]',
      '[class*="tags"]',
      "footer",
    ]) {
      const actual = selector.includes("editorPlaceholder")
        ? page.getByRole("textbox", { name: "본문 편집기" })
        : page.locator(selector).first();
      await expectSameBox(skeleton.locator(selector).first(), actual);
    }
    for (let index = 0; index < 2; index++)
      await expectSameBox(
        skeleton.locator("footer button").nth(index),
        page.locator("footer button").nth(index),
      );
    await loadingPage.screenshot({
      path: testInfo.outputPath("writer-loading.png"),
      fullPage: true,
    });
    await page.screenshot({
      path: testInfo.outputPath("writer-loaded.png"),
      fullPage: true,
    });
  } finally {
    await loadingContext.close();
  }
});

test("art skeleton aligns its heading, tabs and gallery with the page", async ({
  browser,
  page,
  baseURL,
  isMobile,
}, testInfo) => {
  const loadingContext = await browser.newContext({
    javaScriptEnabled: false,
    viewport: page.viewportSize(),
    isMobile,
  });
  try {
    const loadingPage = await loadingContext.newPage();
    await loadingPage.goto(`${baseURL}/category/art`);
    await loadingPage.evaluate(() => {
      const skeleton = Array.from(
        document.querySelectorAll('[aria-label="카테고리 불러오는 중"]'),
      ).find((element) => element.querySelector("h1")?.textContent === "Art");
      if (!skeleton)
        throw new Error("Art loading shell missing from streamed response");
      document.querySelector("main")!.replaceChildren(skeleton);
    });
    const skeleton = loadingPage.locator(
      '[aria-label="카테고리 불러오는 중"]:visible',
    );
    await expect(skeleton).toBeVisible();
    await page.goto("/category/art");
    await expect(
      page.getByRole("heading", { name: "Art", exact: true }),
    ).toBeVisible();
    await Promise.all([
      loadingPage.evaluate(() => document.fonts.ready),
      page.evaluate(() => document.fonts.ready),
    ]);
    await expectSameBox(skeleton.locator("h1"), page.locator("h1"));
    await expectSameBox(
      skeleton.locator('[role="tablist"]'),
      page.getByRole("tablist", { name: "Art 글 보기" }),
    );
    const placeholder = skeleton.locator('[class*="columns-2"]');
    const panel = page.getByRole("tabpanel", { name: "전체", exact: true });
    const before = await placeholder.boundingBox();
    const after = await panel.boundingBox();
    for (const key of ["x", "y", "width"] as const)
      expect(Math.abs(before![key] - after![key]), key).toBeLessThan(1);
    expect(
      await placeholder.evaluate(
        (element) => getComputedStyle(element).columnCount,
      ),
    ).toBe(isMobile ? "2" : "4");
    await loadingPage.screenshot({
      path: testInfo.outputPath("art-loading.png"),
      fullPage: true,
    });
    await page.screenshot({
      path: testInfo.outputPath("art-loaded.png"),
      fullPage: true,
    });
  } finally {
    await loadingContext.close();
  }
});
