import { expect, test } from "@playwright/test";

test("본문 이미지 뷰어의 배치, 탐색, 확대, 접근성과 오류 복구", async ({
  page,
  isMobile,
}) => {
  await page.route("**/web-app-manifest-192x192.png", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="192" height="600"><rect width="192" height="600" fill="#d97706"/><circle cx="96" cy="300" r="60" fill="#fff"/></svg>',
    }),
  );
  await page.goto("/post-1");
  const trigger = page.getByRole("button", {
    name: "가로 사진 확대 보기",
    exact: true,
  });
  const dialog = page.getByRole("dialog", { name: "이미지 뷰어" });
  const close = dialog.getByRole("button", { name: "이미지 뷰어 닫기" });
  const next = dialog.getByRole("button", { name: "다음 이미지", exact: true });
  const previous = dialog.getByRole("button", {
    name: "이전 이미지",
    exact: true,
  });
  await page.locator(".markdown-image").first().scrollIntoViewIfNeeded();
  await expect(trigger).toBeVisible();
  await trigger.scrollIntoViewIfNeeded();
  const before = await trigger.boundingBox();
  await trigger.focus();
  await trigger.press("Enter");
  await expect(dialog).toBeVisible();
  await expect(close).toBeFocused();
  await expect(dialog).toContainText("1 / 8");
  await expect(previous).toBeDisabled();
  await expect(dialog.getByRole("status")).not.toBeVisible();
  await expect(
    dialog.getByRole("button", { name: /^이미지 (확대|축소)$/ }),
  ).toHaveCount(0);
  await expect(page.locator("html")).toHaveCSS("overflow", "hidden");

  await close.press("Shift+Tab");
  await expect(next).toBeFocused();
  await next.press("Tab");
  await expect(close).toBeFocused();

  await dialog.getByRole("img").dblclick();
  const viewport = dialog.locator('[data-zoomed="true"]').first();
  await expect(viewport).toBeVisible();
  await expect(dialog).toContainText("1 / 8");
  if (!isMobile) {
    const bounds = (await viewport.boundingBox())!;
    const start = await viewport.evaluate((element) => element.scrollLeft);
    await page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      bounds.x + bounds.width / 2 - 70,
      bounds.y + bounds.height / 2,
      { steps: 5 },
    );
    await page.mouse.up();
    await expect
      .poll(() => viewport.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(start);
  }
  await dialog.getByRole("img").dblclick();
  await expect(dialog.locator('[data-zoomed="false"]').first()).toBeVisible();
  await close.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  const after = (await trigger.boundingBox())!;
  expect(after.x).toBeCloseTo(before!.x, 0);
  expect(after.width).toBeCloseTo(before!.width, 0);
  await expect(page.locator("html")).not.toHaveCSS("overflow", "hidden");

  for (const [index, layout] of ["individual", "collage", "slide"].entries()) {
    await page
      .getByRole("button", {
        name: `${layout} 세로 사진 확대 보기`,
        exact: true,
      })
      .click();
    await expect(dialog).toContainText(`${index * 2 + 2} / 8`);
    await expect(dialog).toContainText(`${layout} 사진 캡션`);
    await expect(dialog.getByRole("status")).not.toBeVisible();
    const bounds = (await dialog.boundingBox())!;
    const size = page.viewportSize()!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(size.width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(size.height);
    await expect
      .poll(() =>
        dialog.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      )
      .toBe(true);
    if (layout === "collage") {
      await expect(dialog.locator('[data-zoomed="false"]').last()).toHaveCSS(
        "opacity",
        "1",
      );
      await page.screenshot({
        path: `test-results/image-viewer-${isMobile ? "mobile" : "desktop"}.png`,
      });
    }
    // 이미지 요소 안에서도 사진 바깥 여백을 누르면 뷰어가 닫혀야 한다.
    const image = dialog.getByRole("img");
    await image.click();
    await expect(dialog).toBeVisible();
    await image.click({ position: { x: 3, y: 3 } });
    await expect(dialog).not.toBeVisible();
  }

  await trigger.click();
  await close.press("ArrowRight");
  await expect(dialog).toContainText("2 / 8");
  await expect(dialog.locator('[data-zoomed="false"]').first()).toBeVisible();
  await close.press("ArrowLeft");
  await expect(dialog).toContainText("1 / 8");

  const touch = await page.context().newCDPSession(page);
  const swipe = async (dx: number, dy: number) => {
    const bounds = (await dialog
      .locator('[data-zoomed="false"]')
      .first()
      .boundingBox())!;
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + dx, y: y + dy }],
    });
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  };
  await swipe(-90, 0);
  await expect(dialog).toContainText("2 / 8");
  await expect(dialog.getByRole("status")).not.toBeVisible();
  await swipe(0, 90);
  await touch.detach();
  await expect(dialog).toContainText("2 / 8");
  await close.click();

  await page.getByRole("button", { name: "누락된 사진 확대 보기" }).click();
  await expect(dialog.getByRole("status")).toHaveText(
    "이미지를 불러올 수 없습니다.",
  );
  await expect(next).toBeDisabled();
  await previous.click();
  await expect(dialog).toContainText("7 / 8");
  await expect(dialog.getByRole("status")).not.toBeVisible();
  await close.click();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await trigger.focus();
  await trigger.press("Space");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("status")).not.toBeVisible();
  await close.press("Escape");
  await expect(trigger).toBeFocused();
});
