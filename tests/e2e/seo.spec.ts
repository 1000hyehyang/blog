import { expect, test } from "@playwright/test";

test("공개 페이지에 사이트와 글 메타데이터를 제공한다", async ({ page }) => {
  await page.goto("/");
  const website = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  expect(JSON.parse(website!)).toMatchObject({
    "@type": "WebSite",
    name: "1000hyehyang Blog",
  });
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /max-image-preview:large/,
  );

  await page.goto("/posts/post-1");
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
    "content",
    "article",
  );
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
    "content",
    "1000hyehyang Blog",
  );
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
    "content",
    "ko_KR",
  );
  await expect(page.locator('meta[property="article:author"]')).toHaveAttribute(
    "content",
    "https://github.com/1000hyehyang",
  );
  const article = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent())!,
  );
  const canonical = await page
    .locator('link[rel="canonical"]')
    .getAttribute("href");
  expect(article.url).toBe(canonical);
  expect(article.mainEntityOfPage["@id"]).toBe(canonical);
  expect(article.image).toMatch(/^https?:\/\//);
});

test("페이지별 대표 URL을 유지하고 정렬·검색·관리 화면은 색인하지 않는다", async ({
  page,
}) => {
  for (const [path, canonical] of [
    ["/posts?sort=latest", "/posts"],
    ["/posts?cursor=post-3&sort=latest", "/posts?cursor=post-3"],
    ["/posts?cursor=post-3&sort=oldest", "/posts?cursor=post-3&sort=oldest"],
  ]) {
    await page.goto(path);
    const link = page.locator('link[rel="canonical"]');
    await expect(link).toHaveAttribute("href", /^https?:\/\//);
    const url = new URL((await link.getAttribute("href"))!);
    expect(url.pathname + url.search).toBe(canonical);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      url.href,
    );
  }

  for (const path of [
    "/posts?sort=oldest",
    "/search?q=fixture",
    "/login",
    "/posts/not-a-number",
    "/category/not-a-category",
  ]) {
    await page.goto(path);
    await expect(
      page.locator('meta[name="robots"][content*="noindex"]').first(),
    ).toBeAttached();
  }
});
