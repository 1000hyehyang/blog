import { expect, test } from "@playwright/test";
import { categories } from "../../src/config/categories";
import { createTestSession } from "./writer-credentials";

test("series detail responses include the skeleton and canonical URL", async ({
  page,
}) => {
  const detail = await page.goto("/category/essay/series/life-updates");
  expect(await detail!.text()).toContain('aria-label="시리즈 불러오는 중"');
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("여씨 근황");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/category\/essay\/series\/life-updates$/,
  );
});

test("category tabs show series collections and open their posts", async ({
  page,
}, testInfo) => {
  await page.goto("/category/essay");
  const all = page.getByRole("tab", { name: "전체", exact: true });
  const seriesTab = page.getByRole("tab", { name: "시리즈", exact: true });
  await expect(all).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("tabpanel", { name: "전체", exact: true }),
  ).toBeVisible();
  await seriesTab.click();
  await expect(page).toHaveURL("/category/essay");
  const panel = page.getByRole("tabpanel", { name: "시리즈", exact: true });
  await expect(panel).toBeVisible();
  await expect(
    page.getByRole("tabpanel", { name: "전체", exact: true }),
  ).toHaveCount(0);
  const configured = categories.find(
    (category) => category.category === "essay",
  )!.series;
  await expect(panel.locator("[data-series-card]")).toHaveCount(
    configured.length,
  );
  await expect(panel.getByRole("heading", { level: 2 })).toHaveText(
    configured.map((series) => series.label),
  );
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => {
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(value);
    }, theme);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`series-tabs-${theme}.png`),
      fullPage: true,
    });
  }
  await seriesTab.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(all).toBeFocused();
  await expect(all).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(seriesTab).toHaveAttribute("aria-selected", "true");
  const series = configured[0];
  await panel
    .getByRole("link")
    .filter({
      has: page.getByRole("heading", { name: series.label, exact: true }),
    })
    .click();
  await expect(page).toHaveURL(`/category/essay/series/${series.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    series.label,
  );
  await expect(
    page.locator("p:visible").filter({ hasText: /^0개의 포스트$/ }),
  ).toBeVisible();
  await expect(page.getByRole("tablist")).toHaveCount(0);
  const breadcrumb = page.getByRole("navigation", { name: "현재 위치" });
  await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(
    series.label,
  );
  await breadcrumb.getByRole("link", { name: "시리즈", exact: true }).click();
  await expect(page).toHaveURL("/category/essay?tab=series");
  await expect(seriesTab).toHaveAttribute("aria-selected", "true");
});
test("categories do not include invented series and unknown series return 404", async ({
  page,
}) => {
  await page.goto("/category/development");
  await page.getByRole("tab", { name: "시리즈", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "아직 시리즈가 없어요" }),
  ).toBeVisible();
  await page.goto("/category/development?tab=series");
  await page.getByRole("tab", { name: "전체", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Fixture Post 1", exact: true }),
  ).toBeVisible();
  await page.goto("/category/development/series/react");
  await expect(
    page.getByRole("heading", { name: "페이지를 찾을 수 없습니다" }),
  ).toBeVisible();
});

test("series select only appears for categories with series and shares category styling", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.context().addCookies([
    {
      name: "blog-writer",
      value: createTestSession(),
      url: "http://127.0.0.1:3100",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  await page.goto("/write");
  const category = page.getByRole("combobox", {
    name: "카테고리",
    exact: true,
  });
  const series = page.getByRole("combobox", { name: "시리즈", exact: true });
  await expect(series).toHaveCount(0);
  await category.click();
  await page.getByRole("option", { name: "Essay", exact: true }).click();
  await expect(series).toContainText("None");
  await page.mouse.move(0, 0);
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => {
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(value);
    }, theme);
    const appearance = await page
      .getByRole("combobox")
      .evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            y: box.y,
            width: box.width,
            height: box.height,
            font: style.font,
            padding: style.padding,
            border: style.border,
            borderRadius: style.borderRadius,
            background: style.backgroundColor,
            color: style.color,
          };
        }),
      );
    expect(appearance).toHaveLength(2);
    expect(appearance[0]).toEqual(appearance[1]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`writer-selects-${theme}.png`),
    });
  }
  await series.click();
  await expect(page.getByRole("option")).toHaveText([
    "None",
    ...categories
      .find((category) => category.category === "essay")!
      .series.map((series) => series.label),
  ]);
  await page.getByRole("option", { name: "여씨 근황", exact: true }).click();
  await expect(series).toContainText("여씨 근황");
  await series.click();
  await page.getByRole("option", { name: "None", exact: true }).click();
  await expect(series).toContainText("None");
  await series.click();
  await page.getByRole("option", { name: "여씨 근황", exact: true }).click();
  await page.getByRole("button", { name: "완료", exact: true }).click();
  await expect(page.getByRole("spinbutton")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await category.click();
  await expect(
    page.getByRole("option", { name: "CS", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("option", { name: "Art", exact: true }).click();
  await expect(series).toHaveCount(0);
  await category.click();
  await page.getByRole("option", { name: "Essay", exact: true }).click();
  await expect(series).toContainText("None");
});
