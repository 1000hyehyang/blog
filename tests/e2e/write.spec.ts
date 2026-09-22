import { expect, test } from "@playwright/test";
import { createTestSession, testPassword } from "./writer-credentials";

test("local drafts reopen from management, preserve tags and checklist layout, and never publish", async ({
  page,
  isMobile,
}) => {
  let writes = 0;
  page.on("request", (request) => {
    if (
      request.url().includes("/api/write/posts/") &&
      request.method() === "PUT"
    )
      writes++;
  });
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
  await page
    .getByLabel("제목", { exact: true })
    .fill("브라우저 임시 저장 테스트");
  const editor = page.getByRole("textbox", { name: "본문 편집기" });
  await editor.fill("정렬을 확인하는 체크리스트");
  await page.getByRole("button", { name: "체크리스트", exact: true }).click();
  const item = editor.locator('li[data-type="taskItem"]').first();
  const checkbox = await item.locator('input[type="checkbox"]').boundingBox();
  const paragraph = await item.locator("p").first().boundingBox();
  expect(Math.abs(checkbox!.y - paragraph!.y)).toBeLessThan(12);
  expect(checkbox!.x + checkbox!.width).toBeLessThan(paragraph!.x);
  const tags = page.getByLabel("태그", { exact: true });
  await tags.fill("React,한글,");
  await expect(
    page.getByRole("button", { name: "한글 태그 삭제" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "React 태그 삭제" }).click();
  await tags.press("Backspace");
  await expect(tags).toHaveValue("한글");
  await tags.press("Enter");
  const bold = page.getByRole("button", { name: "굵게", exact: true });
  if (!isMobile) await bold.hover();
  else await bold.focus();
  await expect(page.getByRole("tooltip", { name: "굵게" })).toBeVisible();
  await page.getByRole("button", { name: "임시 저장", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "임시 저장" });
  await expect(drawer).toBeVisible();
  const box = await drawer.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.height).toBeCloseTo(viewport.height, 2);
  if (isMobile) expect(box!.width).toBeCloseTo(viewport.width, 2);
  else expect(box!.width).toBeGreaterThan(700);
  await expect(page.getByRole("region", { name: "발행 옵션" })).toHaveCSS(
    "scrollbar-width",
    "none",
  );
  await page.screenshot({
    path: `test-results/draft-drawer-${test.info().project.name}.png`,
    animations: "disabled",
  });
  await drawer.getByRole("button", { name: "임시 저장", exact: true }).click();
  await expect(page).toHaveURL(/\/write\?draft=post-/);
  await page.getByRole("link", { name: "Blog STUDIO" }).click();
  await expect(page).toHaveURL("/manage");
  await page.getByRole("button", { name: "임시 저장", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "브라우저 임시 저장 테스트", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/draft-list-${test.info().project.name}.png`,
    animations: "disabled",
  });
  await page
    .getByRole("link", { name: "브라우저 임시 저장 테스트 이어쓰기" })
    .click();
  await expect(page).toHaveURL(/\/write\?draft=post-/);
  await page.reload();
  await expect(editor).toContainText("정렬을 확인하는 체크리스트");
  await expect(editor.locator('li[data-type="taskItem"]')).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "한글 태그 삭제" }),
  ).toBeVisible();
  expect(writes).toBe(0);
});

test("sequential URLs are canonical and old numeric URLs are gone", async ({
  page,
  request,
}) => {
  const old = await request.get("/posts/20", { maxRedirects: 0 });
  expect(old.headers().location).toBeUndefined();
  await page.goto("/posts/20");
  await expect(page).toHaveURL("/posts/20");
  await expect(
    page.getByRole("heading", { name: "페이지를 찾을 수 없습니다" }),
  ).toBeVisible();
  await page.goto("/posts/post-1");
  await expect(page).toHaveURL("/posts/post-1");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/posts\/post-1$/,
  );
  expect(await (await request.get("/feed.xml")).text()).toContain(
    "/posts/post-1",
  );
  expect(await (await request.get("/sitemap.xml")).text()).toContain(
    "/posts/post-1",
  );
});

test("password login, WYSIWYG editing, publishing controls and logout", async ({
  page,
  isMobile,
}) => {
  await page.goto("/write");
  await expect(page).toHaveURL(/\/login\?next=%2Fwrite$/);
  await expect(page.getByLabel("비밀번호", { exact: true })).toBeVisible();
  await expect(page.getByLabel("비밀번호", { exact: true })).toBeFocused();
  await expect(page.getByText("글 관리", { exact: true })).toHaveCount(0);
  const unauthorized = await page.request.put("/api/write/posts/test", {
    data: { post: {}, sha: null },
    headers: { origin: "http://127.0.0.1:3100" },
  });
  expect(unauthorized.status()).toBe(401);
  await page.getByLabel("비밀번호", { exact: true }).fill(testPassword);
  await expect(page).toHaveURL("/write");
  await expect(page.getByRole("heading", { name: "글쓰기" })).toBeAttached();
  await page.getByLabel("제목", { exact: true }).fill("에디터 확인");
  await page.getByLabel("태그", { exact: true }).fill("한글, 테스트");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.locator('header a[href="/manage"]').click();
  await expect(page).toHaveURL("/write");
  await expect(page.getByLabel("제목", { exact: true })).toHaveValue(
    "에디터 확인",
  );
  const editor = page.getByRole("textbox", { name: "본문 편집기" });
  await editor.fill("화면에서 바로 작성합니다.");
  await editor.press("ControlOrMeta+a");
  await page.getByRole("button", { name: "굵게", exact: true }).click();
  await expect(editor.locator("strong")).toHaveText(
    "화면에서 바로 작성합니다.",
  );
  await expect(page.getByRole("button", { name: "링크" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "글 관리" })).toHaveCount(0);
  await page.getByRole("button", { name: "완료", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const panel = await page
    .getByRole("region", { name: "발행 옵션" })
    .boundingBox();
  const publishButton = await page
    .getByRole("button", { name: "발행", exact: true })
    .boundingBox();
  expect(panel!.y + panel!.height).toBeLessThanOrEqual(publishButton!.y);
  expect(publishButton!.y + publishButton!.height).toBeLessThanOrEqual(
    await page.evaluate(() => innerHeight),
  );
  await page.screenshot({
    animations: "disabled",
    path: `test-results/publish-${test.info().project.name}.png`,
    fullPage: true,
  });
  if (!isMobile) {
    await page.mouse.click(panel!.x / 2, 20);
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page.getByRole("button", { name: "완료", exact: true }).click();
  }
  await expect(page.getByLabel("글 주소", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("요약", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Pinned", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("갤러리 이미지", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("checkbox", { name: "Pinned" }).check();
  await expect(
    page.getByRole("button", { name: "에디터 확인 순서 이동" }),
  ).toBeVisible();
  await expect(page.locator('input[type="number"]')).toHaveCount(0);
  const cards = page.getByRole("dialog").getByRole("listitem");
  const originalOrder = await cards.allTextContents();
  await cards.first().scrollIntoViewIfNeeded();
  const handle = await cards
    .first()
    .getByRole("button", { name: /순서 이동$/ })
    .boundingBox();
  const target = await cards.nth(1).boundingBox();
  await page.mouse.move(
    handle!.x + handle!.width / 2,
    handle!.y + handle!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handle!.x + handle!.width / 2,
    target!.y + target!.height * 0.8,
    { steps: 15 },
  );
  await page.mouse.up();
  await expect(cards.first()).toHaveText(originalOrder[1]);
  await cards
    .first()
    .getByRole("button", { name: /순서 이동$/ })
    .focus();
  await page.keyboard.press("ArrowDown");
  await expect(cards.first()).toHaveText(originalOrder[0]);
  const pinnedCount = await cards.count();
  await page
    .getByRole("button", { name: /Pinned 해제$/ })
    .first()
    .click();
  await expect(cards).toHaveCount(pinnedCount - 1);
  await page.getByRole("button", { name: "발행 설정 닫기" }).click();
  const category = page.getByRole("combobox", { name: "카테고리" });
  await category.click();
  await expect(page.getByRole("listbox", { name: "카테고리" })).toBeVisible();
  await expect(page.getByRole("listbox", { name: "카테고리" })).toHaveCSS(
    "opacity",
    "1",
  );
  await page.screenshot({
    animations: "disabled",
    path: `test-results/select-${test.info().project.name}.png`,
    fullPage: false,
  });
  await page.getByRole("option", { name: "Art", exact: true }).click();
  await expect(category).toHaveText("Art");
  await page.getByRole("button", { name: "완료", exact: true }).click();
  await expect(page.getByLabel("갤러리 이미지", { exact: true })).toBeVisible();
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.screenshot({
    animations: "disabled",
    path: `test-results/publish-dark-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await page.getByRole("button", { name: "발행 설정 닫기" }).click();
  await expect(page.getByRole("button", { name: "미리보기" })).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "문단 스타일" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: /다운로드/ })).toHaveCount(0);
  await expect(page.locator("select")).toHaveCount(0);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
  await page.screenshot({
    animations: "disabled",
    path: `test-results/write-${test.info().project.name}.png`,
    fullPage: true,
  });
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL("/login");
  await expect(page.getByLabel("비밀번호", { exact: true })).toBeVisible();
});

test("management is separate and authentication preserves the edit destination", async ({
  page,
}) => {
  await page.goto("/manage");
  await expect(page).toHaveURL(/\/login\?next=%2Fmanage$/);
  await expect(page.locator('a[href^="/write?slug="]')).toHaveCount(0);
  await page.goto("/write?slug=post-1");
  await expect(page).toHaveURL(/\/login\?next=%2Fwrite%3Fslug%3Dpost-1$/);
  await page.getByLabel("비밀번호", { exact: true }).fill(testPassword);
  await expect(page).toHaveURL("/write?slug=post-1");
  await expect(page.getByRole("heading", { name: "글 수정" })).toBeAttached();
  await page.getByRole("link", { name: "Blog STUDIO" }).click();
  await expect(page).toHaveURL("/manage");
  await expect(page.locator("main ul > li")).toHaveCount(6);
  const edit = page.getByRole("link", { name: / 수정$/ }).first();
  await expect(edit.locator("svg")).toBeVisible();
  expect(await edit.textContent()).toBe("");
  const remove = page.getByRole("button", { name: / 삭제$/ }).first();
  await expect(remove.locator("svg")).toBeVisible();
  expect(await remove.textContent()).toBe("");
  await expect(page.locator('main a[href^="/posts/"]')).toHaveCount(0);
  await page.getByRole("button", { name: "다음 페이지", exact: true }).click();
  await expect(page.locator("main ul > li")).toHaveCount(2);
  await page.getByRole("button", { name: "이전 페이지", exact: true }).click();
  const categoryFilter = page.getByRole("combobox", {
    name: "카테고리 필터",
  });
  await categoryFilter.click();
  await page.getByRole("option", { name: "Art", exact: true }).click();
  await expect(page.locator("main ul > li")).toHaveCount(0);
  await categoryFilter.click();
  await page.getByRole("option", { name: "Development", exact: true }).click();
  await expect(page.locator("main ul > li")).toHaveCount(6);
  const sort = page.getByRole("combobox", { name: "정렬" });
  await sort.click();
  await page.getByRole("option", { name: "오래된순", exact: true }).click();
  const dates = await page.locator("main ul > li time").allTextContents();
  expect(dates).toEqual([...dates].sort());
  await expect(page.getByRole("textbox", { name: "본문 편집기" })).toHaveCount(
    0,
  );
  await page.screenshot({
    animations: "disabled",
    path: `test-results/manage-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.goto("/login?next=https://attacker.example");
  await expect(page).toHaveURL("/manage");
  await page.getByRole("link", { name: "글쓰기" }).click();
  await expect(page).toHaveURL("/write");
  await expect(
    page.getByRole("textbox", { name: "본문 편집기" }),
  ).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    path: `test-results/write-empty-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  const tagsBox = await page.getByLabel("태그", { exact: true }).boundingBox();
  const footerBox = await page.locator("footer").boundingBox();
  expect(tagsBox!.y + tagsBox!.height).toBeLessThanOrEqual(footerBox!.y);
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.screenshot({
    animations: "disabled",
    path: `test-results/write-dark-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL("/login");
  await page.screenshot({
    animations: "disabled",
    path: `test-results/login-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.goto("/manage");
  await expect(page).toHaveURL(/\/login\?next=%2Fmanage$/);
});
