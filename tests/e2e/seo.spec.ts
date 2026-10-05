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

  await page.goto("/post-1");
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
    (await page
      .locator('script[type="application/ld+json"]')
      .first()
      .textContent())!,
  );
  const canonical = await page
    .locator('link[rel="canonical"]')
    .getAttribute("href");
  expect(article.url).toBe(canonical);
  expect(article.mainEntityOfPage["@id"]).toBe(canonical);
  expect(article).not.toHaveProperty("image");
  const breadcrumbs = JSON.parse(
    (await page
      .locator('script[type="application/ld+json"]')
      .nth(1)
      .textContent())!,
  );
  expect(breadcrumbs["@type"]).toBe("BreadcrumbList");
  expect(breadcrumbs.itemListElement.at(-1).item).toBe(canonical);
  await expect(
    page
      .getByRole("navigation", { name: "현재 위치" })
      .getByRole("link", { name: "Development" }),
  ).toHaveAttribute("href", "/category/development");
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
    "/not-a-post",
    "/category/not-a-category",
    "/posts?cursor=missing",
    "/posts?cursor=post-1",
    "/category/development?cursor=missing",
    "/category/essay/series/not-a-series",
  ]) {
    await page.goto(path);
    await expect(
      page.locator('meta[name="robots"][content*="noindex"]').first(),
    ).toBeAttached();
  }
});

test("네이버 봇은 JavaScript 없이 head 메타데이터와 글·내부 링크를 읽는다", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    userAgent: "Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)",
  });
  try {
    const page = await context.newPage();
    await page.goto(`${baseURL}/post-1`);
    await expect(page).toHaveTitle("Fixture Post 1 | 1000hyehyang Blog");
    await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/post-1$/,
    );
    await expect(
      page.locator('head link[type="application/rss+xml"]'),
    ).toHaveAttribute("href", /\/feed\.xml$/);
    await expect(page.locator("h1")).toHaveCount(1);
    // 원본 HTML에 본문이 있는지 검사한다. 스트리밍 세그먼트의 화면
    // 재배치는 아래 검색봇 렌더링 테스트에서 별도로 확인한다.
    await expect(page.locator("h1")).toHaveText("Fixture Post 1");
    await expect(
      page.getByText(
        "This post verifies local content loading and canonical URLs.",
      ),
    ).toBeAttached();
    await expect(
      page.locator('a[href="/category/development"]').first(),
    ).toHaveAttribute("href", "/category/development");
    await page.goto(`${baseURL}/posts?cursor=post-3&sort=latest`);
    await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/posts\?cursor=post-3$/,
    );
    await expect(page.locator('a[href="/post-2"]').first()).toHaveAttribute(
      "href",
      "/post-2",
    );
    for (const path of [
      "/not-a-post",
      "/category/not-a-category",
      "/posts?cursor=missing",
      "/category/development?cursor=post-1",
    ]) {
      await page.goto(`${baseURL}${path}`);
      await expect(
        page.locator('head meta[name="robots"][content*="noindex"]').first(),
      ).toBeAttached();
      await expect(
        page.locator('head meta[name="robots"][content*="index, follow"]'),
      ).toHaveCount(0);
    }
  } finally {
    await context.close();
  }
});

test("빈 분류는 화면을 유지하고 사이트맵과 색인에서 제외한다", async ({
  page,
  request,
}) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/category/development");
  await page.goto("/category/development");
  await expect(
    page.locator('meta[name="robots"][content*="noindex"]'),
  ).toHaveCount(0);
  for (const path of ["/category/art", "/category/essay/series/life-updates"]) {
    expect(sitemap).not.toContain(path);
    await page.goto(path);
    await expect(
      page.locator('meta[name="robots"][content*="noindex"]'),
    ).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
      "content",
      /noindex, follow/,
    );
    await expect(
      page.getByRole("heading", { name: "아직 포스트가 없어요", exact: true }),
    ).toBeVisible();
  }
});

for (const userAgent of ["Googlebot", "Yeti/1.1"]) {
  test(`${userAgent} 렌더링과 스크롤 후 본문 표시를 유지한다`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      userAgent,
      reducedMotion: "no-preference",
    });
    try {
      const page = await context.newPage();
      await page.goto(`${baseURL}/post-1`);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        /\/post-1$/,
      );
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      const body = page.locator('[data-reveal="scroll"]').first();
      await body.evaluate((element) => element.scrollIntoView());
      await expect(body).toHaveCSS("opacity", "1");
      await expect(body).toHaveCSS("visibility", "visible");
      await page.goto(`${baseURL}/not-a-post`);
      await expect(
        page.locator('meta[name="robots"][content*="noindex"]').first(),
      ).toBeAttached();
    } finally {
      await context.close();
    }
  });
}

test("robots·사이트맵·RSS·네이버 확인 파일을 공개 루트에서 제공한다", async ({
  request,
  page,
}) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  const rules = await robots.text();
  expect(rules).toContain("Allow: /");
  expect(rules).not.toContain("Disallow: /\n");
  expect(rules).toMatch(/Sitemap: https?:\/\/[^\s]+\/sitemap\.xml/);
  for (const [path, type] of [
    ["/sitemap.xml", "application/xml"],
    ["/feed.xml", "application/rss+xml"],
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain(type);
    if (path === "/feed.xml")
      expect(await response.text()).toContain(
        "This post verifies local content loading and canonical URLs.",
      );
    const result = await page.evaluate(
      (xml) => {
        const doc = new DOMParser().parseFromString(xml, "application/xml");
        return {
          error: Boolean(doc.querySelector("parsererror")),
          urls: [...doc.querySelectorAll("loc, item > link")].map(
            (node) => node.textContent!,
          ),
        };
      },
      await response.text(),
    );
    expect(result.error).toBe(false);
    expect(result.urls.length).toBeGreaterThanOrEqual(8);
    expect(result.urls.every((url) => /^https?:\/\//.test(url))).toBe(true);
    expect(result.urls.some((url) => url.endsWith("/fixture-id-8"))).toBe(true);
    expect(
      result.urls.some((url) =>
        /\/(?:search|login|manage|write)(?:\?|$)/.test(url),
      ),
    ).toBe(false);
  }
  const verification = await request.get(
    "/naverce470ebee272f20abfd6322ac51562d8.html",
  );
  expect(verification.status()).toBe(200);
  expect((await verification.text()).trim()).toBe(
    "naver-site-verification: naverce470ebee272f20abfd6322ac51562d8.html",
  );
});
