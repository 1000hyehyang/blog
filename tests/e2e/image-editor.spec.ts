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
  await page.getByRole("button", { name: "대표 이미지로 설정" }).click();
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
  await page.getByRole("button", { name: "대표 이미지로 설정" }).click();
  await expect(
    page.getByText("대표 이미지: /web-app-manifest-512x512.png"),
  ).toBeVisible();
  await expect(
    editor
      .locator("figure")
      .first()
      .locator('span[class*="imageRepresentative"]'),
  ).toHaveCount(0);
  await expect(
    editor
      .locator("figure")
      .nth(1)
      .locator('span[class*="imageRepresentative"]'),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "대표 이미지로 설정" }).click();
  await expect(page.getByText("대표 이미지: 없음")).toBeVisible();
  await expect(
    editor.locator('span[class*="imageRepresentative"]'),
  ).toHaveCount(0);
  if (isMobile)
    await page.getByRole("heading", { name: "이미지 편집 테스트" }).tap();
  else await page.getByRole("heading", { name: "이미지 편집 테스트" }).click();
  await expect(page.getByRole("group", { name: "이미지 설정" })).toHaveCount(0);
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
