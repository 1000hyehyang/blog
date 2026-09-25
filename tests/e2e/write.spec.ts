import { expect, test } from "@playwright/test";
import { createTestSession, testPassword } from "./writer-credentials";

test("category options become visible when the select opens", async ({
  page,
}) => {
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
  await page.getByRole("combobox", { name: "카테고리" }).click();
  const option = page.getByRole("option", { name: "Art" });
  await expect(option).toBeVisible();
  await expect(option).toHaveCSS("opacity", "1");
});

test("multiple photos open a responsive layout chooser before upload", async ({
  page,
}) => {
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
    .getByLabel("이미지 파일 선택")
    .setInputFiles([
      "public/og-blog.png",
      "public/web-app-manifest-192x192.png",
    ]);
  const dialog = page.getByRole("dialog", { name: "사진 첨부 방식" });
  await expect(dialog).toBeVisible();
  await expect
    .poll(() =>
      dialog
        .locator("img")
        .first()
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(
    dialog.getByRole("button", { name: "개별사진" }),
  ).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "슬라이드" }).click();
  await expect(
    dialog.getByRole("button", { name: "슬라이드" }),
  ).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "2번째 사진 앞으로 이동" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await dialog.getByRole("button", { name: "사진 첨부 방식 닫기" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "본문 편집기" }).locator("img"),
  ).toHaveCount(0);
});

test("image controls work in a draft on the real writer", async ({
  page,
  isMobile,
}) => {
  await page.context().addCookies([
    {
      name: "blog-writer",
      value: createTestSession(),
      url: "http://127.0.0.1:3100",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  await page.addInitScript(() => {
    const now = new Date().toISOString();
    localStorage.setItem(
      "blog:writer:draft:image-editor-e2e",
      JSON.stringify({
        post: {
          slug: "image-editor-e2e",
          id: "image-editor-e2e",
          title: "이미지 편집 테스트",
          body: "![첫 사진](http://127.0.0.1:3100/og-blog.png)\n\n![둘째 사진](http://127.0.0.1:3100/web-app-manifest-512x512.png)",
          category: { name: "Development", slug: "development" },
          tags: [],
          excerpt: "",
          coverImage: { src: "" },
          featured: false,
          published: false,
          createdAt: now,
          lastEditedAt: null,
          commentsCount: 0,
          reactionsCount: 0,
        },
        sha: null,
        savedAt: now,
        pinned: [],
        order: [],
      }),
    );
  });
  await page.goto("/write?draft=image-editor-e2e");
  const editor = page.getByRole("textbox", { name: "본문 편집기" });
  const figures = editor.locator("figure");
  await expect(figures).toHaveCount(2);
  if (isMobile) await figures.first().locator("img").tap();
  else await figures.first().locator("img").click();
  await page.getByRole("textbox", { name: "캡션" }).fill("첫 번째 캡션");
  await figures
    .first()
    .getByRole("button", { name: "대표 이미지로 설정" })
    .click();
  await expect(
    figures.first().getByRole("button", { name: "대표 이미지로 설정" }),
  ).toHaveAttribute("aria-pressed", "true");
  if (isMobile) await figures.nth(1).locator("img").tap();
  else await figures.nth(1).locator("img").click();
  await expect(figures.first().locator("figcaption")).toHaveText(
    "첫 번째 캡션",
  );
  if (isMobile) await figures.first().locator("img").tap();
  else await figures.first().locator("img").click();
  await figures.first().getByRole("button", { name: "사진 삭제" }).click();
  await expect(figures).toHaveCount(1);
  await expect(figures.first().locator("img")).toHaveAttribute(
    "src",
    "http://127.0.0.1:3100/web-app-manifest-512x512.png",
  );
});

test("table row and column menus stay open while moving from handle to delete", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "This test checks pointer hover menus.");
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
  await page.getByRole("button", { name: "표", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "본문 편집기" });
  await expect(editor.locator("tr")).toHaveCount(3);
  await expect(editor.locator("th")).toHaveCount(0);
  const table = editor.locator("table");
  await editor.locator("tr:first-child td:first-child").hover();
  const tableBox = (await table.boundingBox())!;
  const rowAdd = page.getByRole("button", { name: "마지막에 행 추가" });
  const columnAdd = page.getByRole("button", { name: "마지막에 열 추가" });
  const rowAddBox = (await rowAdd.boundingBox())!;
  const columnAddBox = (await columnAdd.boundingBox())!;
  expect(rowAddBox.y).toBeGreaterThanOrEqual(tableBox.y + tableBox.height + 4);
  expect(columnAddBox.x).toBeGreaterThanOrEqual(
    tableBox.x + tableBox.width + 4,
  );
  await rowAdd.click();
  await expect(editor.locator("tr")).toHaveCount(4);
  await editor.locator("tr:first-child td:first-child").hover();
  await columnAdd.click();
  await expect(editor.locator("tr:first-child td")).toHaveCount(4);
  await editor.locator("tr:nth-child(2) td:first-child").hover();
  await page.getByRole("button", { name: "2행 메뉴" }).click();
  const deleteRow = page.getByRole("menuitem", { name: "행 삭제" });
  await deleteRow.hover();
  await expect(deleteRow).toBeVisible();
  await deleteRow.click();
  await expect(editor.locator("tr")).toHaveCount(3);
  await editor.locator("tr:first-child td:first-child").hover();
  await page.getByRole("button", { name: "1열 메뉴" }).click();
  const deleteColumn = page.getByRole("menuitem", { name: "열 삭제" });
  await deleteColumn.hover();
  await expect(deleteColumn).toBeVisible();
  await deleteColumn.click();
  await expect(editor.locator("tr:first-child td")).toHaveCount(3);
  await editor.locator("tr:first-child td:first-child").hover();
  const tableHandle = page.getByRole("button", { name: "표 메뉴" });
  const tableHandleBox = (await tableHandle.boundingBox())!;
  const firstRowBox = (await editor.locator("tr:first-child").boundingBox())!;
  expect(tableHandleBox.x + tableHandleBox.width).toBeLessThan(tableBox.x);
  expect(
    Math.abs(
      tableHandleBox.y +
        tableHandleBox.height / 2 -
        firstRowBox.y -
        firstRowBox.height / 2,
    ),
  ).toBeLessThan(2);
  await tableHandle.hover();
  await tableHandle.click();
  await page.getByRole("menuitem", { name: "표 삭제" }).click();
  await expect(table).toHaveCount(0);
});

test("mobile table handles and add controls stay on screen", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "This test checks the touch layout.");
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
  await page.getByRole("button", { name: "표", exact: true }).tap();
  const editor = page.getByRole("textbox", { name: "본문 편집기" });
  const table = editor.locator("table");
  await editor.locator("tr:first-child td:first-child").tap();
  const tableHandle = page.getByRole("button", { name: "표 메뉴" });
  const rowHandle = page.getByRole("button", { name: "1행 메뉴" });
  const rowAdd = page.getByRole("button", { name: "마지막에 행 추가" });
  const columnAdd = page.getByRole("button", { name: "마지막에 열 추가" });
  await expect(tableHandle).toBeInViewport();
  await expect(rowHandle).toBeInViewport();
  await expect(rowAdd).toBeInViewport();
  await expect(columnAdd).toBeInViewport();
  for (const control of [tableHandle, rowHandle, rowAdd, columnAdd]) {
    const box = (await control.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
  const bar = (await rowAdd.boundingBox())!;
  const icon = (await rowAdd.locator("svg").boundingBox())!;
  const tableBox = (await table.boundingBox())!;
  expect(
    Math.abs(icon.x + icon.width / 2 - bar.x - bar.width / 2),
  ).toBeLessThan(1);
  expect(
    Math.abs(icon.y + icon.height / 2 - bar.y - bar.height / 2),
  ).toBeLessThan(1);
  expect(bar.y - tableBox.y - tableBox.height).toBeGreaterThanOrEqual(3);
  await tableHandle.tap();
  await page.getByRole("menuitem", { name: "표 삭제" }).tap();
  await expect(table).toHaveCount(0);
});

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
