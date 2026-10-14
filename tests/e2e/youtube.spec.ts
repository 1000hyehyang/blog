import { expect, test } from "@playwright/test";

test("keeps the native player in server HTML when JavaScript is disabled", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    userAgent: "Yeti/1.1",
  });
  const page = await context.newPage();
  await page.route("https://www.youtube-nocookie.com/embed/**", (route) =>
    route.fulfill({ body: "Player" }),
  );
  await page.goto("/fixture-id-8");
  await expect(page.locator(".youtube-player iframe")).toBeAttached();
  await expect(page.locator(".youtube-player iframe")).toHaveAttribute(
    "src",
    "https://www.youtube-nocookie.com/embed/0F1BsTyt_XU?rel=0",
  );
  await context.close();
});

test("streamed YouTube players navigate once and retain native iframe behavior", async ({
  page,
}) => {
  const requests: string[] = [];
  await page.route(
    "https://www.youtube-nocookie.com/embed/**",
    async (route) => {
      requests.push(route.request().url());
      await route.fulfill({
        contentType: "text/html",
        body: "<button>Play</button>",
      });
    },
  );
  await page.goto("/fixture-id-8");
  const player = page.locator(".youtube-player iframe");
  await expect(player).toHaveCount(1);
  await expect(player).toHaveAttribute("loading", "lazy");
  await expect(player).toHaveAttribute("allowfullscreen", "");
  await player.scrollIntoViewIfNeeded();
  await expect.poll(() => requests.length).toBe(1);
  await page
    .frameLocator(".youtube-player iframe")
    .getByRole("button", { name: "Play" })
    .click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await player.scrollIntoViewIfNeeded();
  await expect(page.locator(".youtube-player")).toHaveCSS(
    "aspect-ratio",
    "16 / 9",
  );
  expect(requests).toEqual([
    "https://www.youtube-nocookie.com/embed/0F1BsTyt_XU?rel=0",
  ]);
});
