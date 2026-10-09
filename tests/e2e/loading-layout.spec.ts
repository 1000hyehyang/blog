import { expect, test, type Locator } from "@playwright/test";
import {
  testSessionCookie,
  testSessionSecure,
  createTestSession,
} from "./writer-credentials";

async function expectSameBox(
  placeholder: Locator,
  content: Locator,
  keys: ("x" | "y" | "width" | "height")[] = ["x", "y", "width", "height"],
) {
  await expect(async () => {
    const before = await placeholder.boundingBox();
    const after = await content.boundingBox();
    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    for (const key of keys)
      expect(
        Math.abs(before![key] - after![key]),
        `${placeholder}: ${key}`,
      ).toBeLessThan(1);
  }).toPass({ timeout: 5_000 });
}

test("layout measurements wait for content replaced during loading", async ({
  page,
}) => {
  await page.setContent(`
    <div id="placeholder" style="position:absolute;left:0;top:0;width:100px;height:20px"></div>
    <div id="content" hidden style="position:absolute;left:0;top:0;width:100px;height:20px"></div>
  `);
  await page.evaluate(() => {
    setTimeout(() => {
      const content = document.querySelector<HTMLElement>("#content")!;
      const replacement = content.cloneNode(true) as HTMLElement;
      replacement.hidden = false;
      content.replaceWith(replacement);
    }, 100);
  });
  await expectSameBox(page.locator("#placeholder"), page.locator("#content"));
});

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
        name: testSessionCookie,
        secure: testSessionSecure,
        value: createTestSession(),
        domain: "127.0.0.1",
        path: "/",
      },
    ];
    await loadingContext.addCookies(cookies);
    await page.context().addCookies(cookies);
    const loadingPage = await loadingContext.newPage();
    await loadingPage.goto(`${baseURL}/write`);
    const skeleton = loadingPage.locator(
      '[aria-label="글쓰기 화면 불러오는 중"]:visible',
    );
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

test("post detail skeleton matches the hero, body and table of contents layout", async ({
  browser,
  page,
  baseURL,
  isMobile,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const loadingContext = await browser.newContext({
    javaScriptEnabled: false,
    viewport: page.viewportSize(),
    isMobile,
  });
  try {
    const loadingPage = await loadingContext.newPage();
    await loadingPage.goto(`${baseURL}/fixture-id-8`);
    const skeleton = loadingPage.locator('[aria-label="포스트 로딩 중"]');
    await expect(skeleton).toBeVisible();
    await expect(
      loadingPage.locator('[aria-label="콘텐츠 로딩 중"]'),
    ).toHaveCount(0);
    await page.goto("/fixture-id-8");
    const article = page.locator("article.page-shell--detail:not([aria-busy])");
    await expect(article.locator(".prose")).toBeVisible();
    await Promise.all([
      loadingPage.evaluate(() => document.fonts.ready),
      page.evaluate(() => document.fonts.ready),
    ]);
    await expectSameBox(skeleton.locator("header"), article.locator("header"));
    await expectSameBox(
      skeleton.locator("header > div:last-child > div:first-child"),
      article.locator("header h1"),
      ["x", "y", "height"],
    );
    await expectSameBox(
      skeleton.locator("header .size-7"),
      article.locator("header .size-7"),
    );
    await expectSameBox(skeleton.locator(".prose"), article.locator(".prose"), [
      "x",
      "y",
      "width",
    ]);
    await expectSameBox(
      skeleton.locator(".prose h2"),
      article.locator(".prose h2").first(),
    );
    await expectSameBox(
      skeleton.locator("section").first().locator(":scope > div").first(),
      article.locator("#comments-title"),
      ["height"],
    );
    if (isMobile) {
      await expect(skeleton.locator("aside")).toBeHidden();
      await expect(article.locator("aside")).toBeHidden();
    } else {
      for (let index = 0; index < 3; index++)
        await expectSameBox(
          skeleton.locator("aside li").nth(index),
          article.locator("aside li").nth(index),
        );
    }
    await loadingPage.screenshot({
      path: testInfo.outputPath("post-detail-loading.png"),
      fullPage: true,
    });
    await page.screenshot({
      path: testInfo.outputPath("post-detail-loaded.png"),
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
    const panel = page.getByRole("tabpanel", { name: "전체", exact: true });
    await expect(panel).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Art", exact: true }),
    ).toBeVisible();
    await Promise.all([
      loadingPage.evaluate(() => document.fonts.ready),
      page.evaluate(() => document.fonts.ready),
    ]);
    await expectSameBox(
      skeleton.locator("h1"),
      page.getByRole("heading", { name: "Art", exact: true }),
    );
    await expectSameBox(
      skeleton.locator('[role="tablist"]'),
      page.getByRole("tablist", { name: "Art 글 보기" }),
    );
    const placeholder = skeleton.locator('[class*="columns-2"]');
    await expectSameBox(placeholder, panel, ["x", "y", "width"]);
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
