import { expect, test } from "@playwright/test";

test("image controls stay with the selected image and persist through reopening", async ({
  page,
  isMobile,
}) => {
  await page.goto("/dev/image-editor");
  const editor = page.locator('[aria-label="이미지 편집 데모"]');
  const images = editor.locator("figure img");
  await expect(images).toHaveCount(2);
  await expect(page.getByRole("group", { name: "이미지 설정" })).toHaveCount(0);
  if (isMobile) await images.first().tap();
  else await images.first().click();
  await expect(page.getByRole("group", { name: "이미지 설정" })).toBeVisible();
  await page
    .getByRole("textbox", { name: "캡션" })
    .pressSequentially("첫 번째 캡션");
  await expect(page.getByRole("textbox", { name: "캡션" })).toHaveValue(
    "첫 번째 캡션",
  );
  await page.getByRole("button", { name: "오른쪽 정렬" }).click();
  await editor
    .locator("figure")
    .first()
    .getByRole("button", { name: "대표 이미지로 설정" })
    .click();
  await expect(page.getByText("대표 이미지: /og-blog.png")).toBeVisible();
  await expect(editor.locator("figure").first()).toHaveAttribute(
    "data-align",
    "right",
  );
  await expect(page.getByRole("textbox", { name: "캡션" })).toHaveValue(
    "첫 번째 캡션",
  );
  await page.getByRole("button", { name: "본문 저장" }).click();
  await page.getByRole("button", { name: "저장한 본문 다시 열기" }).click();
  await expect(editor.locator("figure").first()).toHaveAttribute(
    "data-align",
    "right",
  );
  await expect(
    editor.locator("figure").first().locator("figcaption"),
  ).toHaveText("첫 번째 캡션");
  if (isMobile) await images.nth(1).tap();
  else await images.nth(1).click();
  await editor
    .locator("figure")
    .nth(1)
    .getByRole("button", { name: "대표 이미지로 설정" })
    .click();
  await expect(
    page.getByText("대표 이미지: /web-app-manifest-512x512.png"),
  ).toBeVisible();
  await expect(
    editor
      .locator("figure")
      .first()
      .getByRole("button", { name: "대표 이미지로 설정" }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(
    editor
      .locator("figure")
      .nth(1)
      .getByRole("button", { name: "대표 이미지로 설정" }),
  ).toHaveAttribute("aria-pressed", "true");
  await editor
    .locator("figure")
    .nth(1)
    .getByRole("button", { name: "대표 이미지로 설정" })
    .click();
  await expect(page.getByText("대표 이미지: 없음")).toBeVisible();
  await expect(
    editor.locator(
      'button[aria-label="대표 이미지로 설정"][aria-pressed="true"]',
    ),
  ).toHaveCount(0);
  if (isMobile)
    await page.getByRole("heading", { name: "이미지 편집 테스트" }).tap();
  else await page.getByRole("heading", { name: "이미지 편집 테스트" }).click();
  await expect(page.getByRole("group", { name: "이미지 설정" })).toHaveCount(0);
});

test("individual photo actions stay inside the photo and delete only that photo", async ({
  page,
  isMobile,
}) => {
  await page.goto("/dev/image-editor");
  const editor = page.locator('[aria-label="이미지 편집 데모"]');
  const first = editor.locator("figure").first();
  const image = first.locator("img");
  if (isMobile) await image.tap();
  else await image.hover();
  const cover = first.getByRole("button", { name: "대표 이미지로 설정" });
  const remove = first.getByRole("button", { name: "사진 삭제" });
  await expect(cover).toHaveCSS("opacity", "1");
  await expect(remove).toHaveCSS("opacity", "1");
  const imageBox = (await image.boundingBox())!;
  for (const button of [cover, remove]) {
    const box = (await button.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(imageBox.x);
    expect(box.y).toBeGreaterThanOrEqual(imageBox.y);
    expect(box.x + box.width).toBeLessThanOrEqual(imageBox.x + imageBox.width);
    expect(box.y + box.height).toBeLessThanOrEqual(
      imageBox.y + imageBox.height,
    );
  }
  await cover.click();
  await expect(page.getByText("대표 이미지: /og-blog.png")).toBeVisible();
  await remove.click();
  await expect(editor.locator("figure img")).toHaveCount(1);
  await expect(editor.locator("figure img")).toHaveAttribute(
    "src",
    "/web-app-manifest-512x512.png",
  );
  await expect(page.getByText("대표 이미지: 없음")).toBeVisible();
});

test("image resize commits one undoable change", async ({ page, isMobile }) => {
  test.skip(isMobile, "Pointer drag is checked in desktop Chromium.");
  await page.goto("/dev/image-editor");
  const image = page
    .locator('[aria-label="이미지 편집 데모"]')
    .locator("figure")
    .first();
  await image.locator("img").click();
  await expect(image.locator('button[class*="imageResize"]')).toHaveCount(4);
  await expect
    .poll(() =>
      image.evaluate(
        (element) => getComputedStyle(element.parentElement!).outlineStyle,
      ),
    )
    .toBe("none");
  const handle = page.getByRole("button", {
    name: "오른쪽 아래 이미지 크기 조절",
  });
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x - 140, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  const resizedWidth = await image.evaluate(
    (element) => (element as HTMLElement).style.width,
  );
  expect(Number.parseInt(resizedWidth)).toBeLessThan(100);
  await page.getByRole("button", { name: "본문 저장" }).click();
  await expect(page.locator("details pre")).toContainText("blog-image:v1:");
  await page.getByRole("button", { name: "실행 취소" }).click();
  await expect
    .poll(() =>
      image.evaluate((element) => (element as HTMLElement).style.width),
    )
    .toBe("fit-content");
  await page.getByRole("button", { name: "다시 실행" }).click();
  await expect
    .poll(() =>
      image.evaluate((element) => (element as HTMLElement).style.width),
    )
    .toBe(resizedWidth);
  await page.getByRole("button", { name: "본문 저장" }).click();
  await page.getByRole("button", { name: "저장한 본문 다시 열기" }).click();
  await expect
    .poll(() =>
      image.evaluate((element) => (element as HTMLElement).style.width),
    )
    .toBe(resizedWidth);
  await image.locator("img").click();
  await page.getByRole("button", { name: "오른쪽 정렬" }).click();
  const oppositeHandle = await page
    .getByRole("button", { name: "왼쪽 위 이미지 크기 조절" })
    .boundingBox();
  expect(oppositeHandle).not.toBeNull();
  await page.mouse.move(
    oppositeHandle!.x + oppositeHandle!.width / 2,
    oppositeHandle!.y + oppositeHandle!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    oppositeHandle!.x + oppositeHandle!.width / 2 + 80,
    oppositeHandle!.y + oppositeHandle!.height / 2,
    { steps: 5 },
  );
  await page.mouse.up();
  expect(
    Number.parseInt(
      await image.evaluate((element) => (element as HTMLElement).style.width),
    ),
  ).toBeLessThan(Number.parseInt(resizedWidth));
  const narrowHandle = (await handle.boundingBox())!;
  await page.mouse.move(narrowHandle.x + 10, narrowHandle.y + 10);
  await page.mouse.down();
  await page.mouse.move(narrowHandle.x + 700, narrowHandle.y + 10);
  await page.mouse.up();
  await page.setViewportSize({ width: 390, height: 844 });
  const toolbar = await page
    .getByRole("group", { name: "이미지 설정" })
    .boundingBox();
  expect(toolbar).not.toBeNull();
  expect(toolbar!.x).toBeGreaterThanOrEqual(0);
  expect(toolbar!.x + toolbar!.width).toBeLessThanOrEqual(390);
});

test("image groups switch layouts, reorder photos and survive reopening", async ({
  page,
}) => {
  await page.goto("/dev/image-editor");
  await page.getByRole("button", { name: "사진 묶음 추가" }).click();
  const group = page.locator('figure[class*="imageGroupFigure"]');
  await expect(group.locator("img")).toHaveCount(3);
  await group.getByRole("button", { name: "1번째 사진 선택" }).click();
  const toolbar = page.getByRole("group", { name: "사진 묶음 설정" });
  await expect(toolbar).toBeVisible();
  await toolbar.getByRole("button", { name: "슬라이드" }).click();
  await expect(group.locator("[data-layout]")).toHaveAttribute(
    "data-layout",
    "slide",
  );
  await group.getByRole("button", { name: "다음 사진" }).click();
  await expect(group).toContainText("2 / 3");
  await group
    .getByRole("button", { name: "2번째 사진을 대표 이미지로 설정" })
    .click();
  await expect(
    page.getByText("대표 이미지: /web-app-manifest-512x512.png?group=1"),
  ).toBeVisible();
  await toolbar.getByRole("button", { name: "사진을 앞으로 이동" }).click();
  await expect(group.locator("img").first()).toHaveAttribute(
    "src",
    "/web-app-manifest-512x512.png?group=1",
  );
  await group
    .getByRole("textbox", { name: "묶음 캡션" })
    .pressSequentially("여행 사진");
  await expect(group.getByRole("textbox", { name: "묶음 캡션" })).toHaveValue(
    "여행 사진",
  );
  await group.getByRole("textbox", { name: "묶음 캡션" }).press("Tab");
  await page.getByRole("button", { name: "본문 저장" }).click();
  await page.getByRole("button", { name: "저장한 본문 다시 열기" }).click();
  await expect(group.locator("img")).toHaveCount(3);
  await expect(group.locator("[data-layout]")).toHaveAttribute(
    "data-layout",
    "slide",
  );
  await expect(group.locator("figcaption")).toContainText("여행 사진");
  await group.getByRole("button", { name: "1번째 사진 선택" }).click();
  await toolbar.getByRole("button", { name: "콜라주" }).click();
  await expect(group.locator("[data-layout]")).toHaveAttribute(
    "data-layout",
    "collage",
  );
  await toolbar.getByRole("button", { name: "묶음 삭제" }).click();
  await expect(group).toHaveCount(0);
  await expect(page.getByText("대표 이미지: 없음")).toBeVisible();
});

test("collage keeps every photo uncropped and places controls inside each photo", async ({
  page,
  isMobile,
}) => {
  await page.goto("/dev/image-editor");
  await page.getByRole("button", { name: "사진 묶음 추가" }).click();
  const group = page.locator('figure[class*="imageGroupFigure"]');
  const row = group.locator('span[class*="row"]').first();
  await expect
    .poll(() =>
      row
        .locator("img")
        .evaluateAll((images) =>
          images.every((image) => (image as HTMLImageElement).naturalWidth > 0),
        ),
    )
    .toBe(true);
  const measures = await row.locator("img").evaluateAll((images) =>
    images.map((image) => {
      const img = image as HTMLImageElement;
      const rect = img.getBoundingClientRect();
      return {
        ratio: rect.width / rect.height,
        naturalRatio: img.naturalWidth / img.naturalHeight,
        top: rect.top,
        bottom: rect.bottom,
      };
    }),
  );
  for (const image of measures) {
    expect(Math.abs(image.ratio - image.naturalRatio)).toBeLessThan(0.02);
    expect(Math.abs(image.top - measures[0].top)).toBeLessThan(1);
    expect(Math.abs(image.bottom - measures[0].bottom)).toBeLessThan(1);
  }
  const first = group.getByRole("button", { name: "1번째 사진 선택" });
  if (isMobile) await first.tap();
  else await first.hover();
  const cover = group.getByRole("button", {
    name: "1번째 사진을 대표 이미지로 설정",
  });
  await expect(cover).toBeVisible();
  const imageBox = (await first.boundingBox())!;
  const coverBox = (await cover.boundingBox())!;
  expect(coverBox.x).toBeGreaterThan(imageBox.x);
  expect(coverBox.y).toBeGreaterThan(imageBox.y);
  await first.click();
  await expect(group).not.toHaveCSS("outline-style", "solid");
});

test("removing photos from a group keeps the remaining photo and cover", async ({
  page,
}) => {
  await page.goto("/dev/image-editor");
  await page.getByRole("button", { name: "사진 묶음 추가" }).click();
  const group = page.locator('figure[class*="imageGroupFigure"]');
  await group.getByRole("button", { name: "3번째 사진 선택" }).click();
  await group
    .getByRole("button", { name: "3번째 사진을 대표 이미지로 설정" })
    .click();
  await group.getByRole("button", { name: "3번째 사진 삭제" }).click();
  await expect(group.locator("img")).toHaveCount(2);
  await expect(
    page.getByText("대표 이미지: /web-app-manifest-512x512.png?group=1"),
  ).toBeVisible();
  await group.getByRole("button", { name: "2번째 사진 선택" }).click();
  await group.getByRole("button", { name: "2번째 사진 삭제" }).click();
  await expect(group).toHaveCount(0);
  await expect(
    page.locator('[aria-label="이미지 편집 데모"] figure img'),
  ).toHaveCount(3);
  await expect(
    page.getByText("대표 이미지: /og-blog.png?group=1"),
  ).toBeVisible();
});

test("switching a group to individual photos restores single-image controls", async ({
  page,
}) => {
  await page.goto("/dev/image-editor");
  await page.getByRole("button", { name: "사진 묶음 추가" }).click();
  const editor = page.locator('[aria-label="이미지 편집 데모"]');
  await editor
    .locator('figure[class*="imageGroupFigure"]')
    .getByRole("button", { name: "1번째 사진 선택" })
    .click();
  await page
    .getByRole("group", { name: "사진 묶음 설정" })
    .getByRole("button", { name: "개별사진" })
    .click();
  await expect(editor.locator('figure[class*="imageGroupFigure"]')).toHaveCount(
    0,
  );
  await expect(editor.locator("figure img")).toHaveCount(5);
  await editor.locator('img[src="/og-blog.png?group=1"]').click();
  await expect(page.getByRole("textbox", { name: "캡션" })).toBeVisible();
  await page.getByRole("button", { name: "콜라주로 묶기" }).click();
  await expect(
    editor.locator('figure[class*="imageGroupFigure"] img'),
  ).toHaveCount(3);
  await editor
    .locator('figure[class*="imageGroupFigure"]')
    .getByRole("button", { name: "1번째 사진 선택" })
    .click();
  await page
    .getByRole("group", { name: "사진 묶음 설정" })
    .getByRole("button", { name: "개별사진" })
    .click();
  await editor.locator('img[src="/og-blog.png?group=1"]').click();
  await page.getByRole("textbox", { name: "캡션" }).fill("첫 사진 설명");
  await page.getByRole("heading", { name: "이미지 편집 테스트" }).click();
  await editor.locator('img[src="/og-blog.png?group=1"]').click();
  await expect(page.getByRole("textbox", { name: "캡션" })).toHaveValue(
    "첫 사진 설명",
  );
  await expect(page.getByRole("button", { name: "콜라주로 묶기" })).toHaveCount(
    0,
  );
});
