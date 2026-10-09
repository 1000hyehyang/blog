import { expect, test } from "@playwright/test";

test("앵커 직접 접근과 새로고침에서 대상 위치를 유지한다", async ({ page }) => {
  await page.goto("/post-1#comments-title");
  for (let attempt = 0; attempt < 2; attempt++) {
    await expect(
      page
        .getByRole("heading", { name: "Fixture Post 1", exact: true })
        .first(),
    ).toBeAttached();
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(100);
    await expect
      .poll(() =>
        page
          .locator("#comments-title")
          .evaluate((node) => Math.abs(node.getBoundingClientRect().top)),
      )
      .toBeLessThan(150);
    if (attempt === 0) await page.reload();
  }
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`목차 이동 후 이미지가 로딩되어도 제목 위치를 유지한다 (${reducedMotion})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion });
    let releaseImage!: () => void;
    const imageReady = new Promise<void>((resolve) => {
      releaseImage = resolve;
    });
    await page.route("**/toc-delayed-image.svg", async (route) => {
      await imageReady;
      await route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"></svg>',
      });
    });
    await page.goto("/fixture-id-8");
    const body = page.locator('[data-reveal="scroll"]').first();
    await body.evaluate((element) => element.scrollIntoView());
    await expect(body).toHaveCSS("opacity", "1");
    await expect(body).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
    const links = page
      .getByRole("navigation", { name: "목차" })
      .getByRole("link");
    const target = page.locator(".prose [id]").nth(1);
    await target.evaluate((heading) => {
      const spacer = document.createElement("div");
      spacer.style.height = "1800px";
      const image = document.createElement("img");
      image.src = "/toc-delayed-image.svg";
      image.style.cssText = "display:block;width:100%;height:auto";
      heading.before(spacer, image);
      const bottom = spacer.cloneNode() as HTMLElement;
      heading.closest(".prose")!.append(bottom);
    });
    const initialScrollY = await page.evaluate(() => {
      let smoothScrolls = 0;
      document.documentElement.dataset.tocSmoothScrolls = "0";
      const scroll = window.scrollTo.bind(window);
      window.scrollTo = (
        options: ScrollToOptions | number = {},
        y?: number,
      ) => {
        if (typeof options === "number") return scroll(options, y ?? 0);
        if (options.behavior === "smooth") {
          document.documentElement.dataset.tocSmoothScrolls = String(
            ++smoothScrolls,
          );
        }
        scroll(options);
      };
      return window.scrollY;
    });
    await links.nth(1).click();
    await expect(page).toHaveURL(/\/fixture-id-8$/);

    if (reducedMotion === "no-preference") {
      await expect
        .poll(() => page.evaluate(() => window.scrollY))
        .toBeGreaterThan(initialScrollY + 1);
      expect(
        await target.evaluate((heading) => heading.getBoundingClientRect().top),
      ).toBeGreaterThan(97);
    }

    releaseImage();
    await expect(
      page.locator('img[src="/toc-delayed-image.svg"]'),
    ).toHaveJSProperty("complete", true);
    await expect
      .poll(async () =>
        target.evaluate((heading) =>
          Math.abs(heading.getBoundingClientRect().top - 96),
        ),
      )
      .toBeLessThan(1);
    await expect(links.nth(1)).toHaveAttribute("aria-current", "location");
    if (reducedMotion === "no-preference") {
      const smoothScrolls = await page.evaluate(() =>
        Number(document.documentElement.dataset.tocSmoothScrolls),
      );
      expect(smoothScrolls).toBeLessThanOrEqual(1);
    }

    for (const index of [2, 0, 1, 0, 2]) {
      await links.nth(index).click();
      const id = (await links.nth(index).getAttribute("href"))!.slice(1);
      await expect
        .poll(() =>
          page.evaluate(
            (id) =>
              Math.abs(
                document.getElementById(id)!.getBoundingClientRect().top - 96,
              ),
            id,
          ),
        )
        .toBeLessThan(1);
      await expect(links.nth(index)).toHaveAttribute(
        "aria-current",
        "location",
      );
    }
  });
}
