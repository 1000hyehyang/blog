import { writeDraftRecord, readDraftRecord } from "../draft-storage";
import { expect, test } from "@playwright/test";
import { POST_BODY_MAX_BYTES } from "../../src/domain/post";
import {
  testSessionCookie,
  testSessionSecure,
  createTestSession,
} from "./writer-credentials";

test.beforeEach(async ({ page }) => {
  await page.context().addCookies([
    {
      name: testSessionCookie,
      secure: testSessionSecure,
      value: createTestSession(),
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
});

test("restores unfinished image URLs and the latest body after logout", async ({
  page,
}) => {
  await page.goto("/write");
  const editor = page.getByRole("textbox", { name: "본문 편집기" });
  await expect(editor).toBeVisible();
  await page.getByLabel("제목", { exact: true }).fill("로그아웃 복구 확인");
  await page.getByRole("button", { name: "완료", exact: true }).click();
  await page.getByLabel("대표 이미지", { exact: true }).fill("https://");
  await page.getByRole("button", { name: "발행 설정 닫기" }).click();
  page.on("dialog", (dialog) => dialog.accept());
  await editor.fill("로그아웃 직전 마지막 본문");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/login$/);
  const raw = await page.evaluate(readDraftRecord, {
    key: "new",
    store: "recovery",
  });
  expect(JSON.parse(raw!).post.body).toContain("로그아웃 직전 마지막 본문");
  expect(JSON.parse(raw!).post.coverImage.src).toBe("https://");
  await page.context().addCookies([
    {
      name: testSessionCookie,
      secure: testSessionSecure,
      value: createTestSession(),
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  await page.goto("/write");
  await expect(editor).toHaveText("로그아웃 직전 마지막 본문");
  await expect(page.getByLabel("제목", { exact: true })).toHaveValue(
    "로그아웃 복구 확인",
  );
  await page.getByRole("button", { name: "완료", exact: true }).click();
  await expect(page.getByLabel("대표 이미지", { exact: true })).toHaveValue(
    "https://",
  );
});

test("restores the latest unsaved title and body after browser Back and Forward", async ({
  page,
}) => {
  await page.goto("/manage");
  await page.getByRole("link", { name: "글쓰기", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "본문 편집기" });
  await expect(editor).toBeVisible();
  await page.getByLabel("제목", { exact: true }).fill("미저장 복구 확인");
  await editor.fill("뒤로 가기 직전 마지막 본문");
  await page.goBack();
  await expect(page).toHaveURL(/\/manage$/);
  await page.goForward();
  await expect(editor).toHaveText("뒤로 가기 직전 마지막 본문");
  await expect
    .poll(async () => {
      const raw = await page.evaluate(readDraftRecord, {
        key: "new",
        store: "recovery",
      });
      return raw && JSON.parse(raw).post.body;
    })
    .toContain("뒤로 가기 직전 마지막 본문");
  await expect(page.getByLabel("제목", { exact: true })).toHaveValue(
    "미저장 복구 확인",
  );
  page.on("dialog", (dialog) => dialog.accept());
  await page.reload();
  await expect(editor).toHaveText("뒤로 가기 직전 마지막 본문");
});

test("opens, edits, saves and reopens a large local draft without changing the editor UI", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  await page.goto("/manage");
  const paragraph = "대용량 😀 Markdown paragraph ".repeat(600);
  const repeats = Math.floor(
    (POST_BODY_MAX_BYTES - 1024) / Buffer.byteLength(paragraph + "\n\n"),
  );
  const body = Array(repeats).fill(paragraph).join("\n\n") + "\n\n본문 끝 검증";
  const now = new Date().toISOString();
  await page.evaluate(writeDraftRecord, {
    key: "blog:writer:draft:large",
    raw: JSON.stringify({
      post: {
        id: "large",
        slug: "large",
        title: "Large draft",
        body,
        category: { name: "Development", slug: "development" },
        tags: [],
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
  });
  const start = Date.now();
  await page.goto("/write?draft=large");
  const editor = page.getByRole("textbox", { name: "본문 편집기" });
  await expect(editor).toBeVisible({ timeout: 60_000 });
  await expect(editor.locator("p").last()).toHaveText("본문 끝 검증");
  const openedMs = Date.now() - start;
  await editor.locator("p").first().click();
  await page.keyboard.press("Home");
  await page.keyboard.type("EDIT ");
  await page.getByRole("button", { name: "임시 저장", exact: true }).click();
  await page
    .getByRole("dialog", { name: "임시 저장" })
    .getByRole("button", { name: "임시 저장", exact: true })
    .click();
  await expect(page.getByRole("dialog", { name: "임시 저장" })).not.toBeVisible(
    { timeout: 60_000 },
  );
  const saved = JSON.parse(
    (await page.evaluate(readDraftRecord, { key: "blog:writer:draft:large" }))!,
  );
  expect(saved.post.body).toContain("EDIT ");
  expect(saved.post.body).toContain("본문 끝 검증");
  expect(Buffer.byteLength(saved.post.body)).toBeLessThanOrEqual(
    POST_BODY_MAX_BYTES,
  );
  await page.reload();
  await expect(editor.locator("p").first()).toContainText("EDIT ", {
    timeout: 60_000,
  });
  await expect(editor.locator("p").last()).toHaveText("본문 끝 검증");
  console.info("[browser-size-check]", {
    project: testInfo.project.name,
    bodyBytes: Buffer.byteLength(body),
    openedMs,
    totalMs: Date.now() - start,
  });
});

test("recovers pinned state and preserves image links and editable footnotes in a reopened draft", async ({
  page,
}) => {
  await page.goto("/manage");
  const body =
    "[![photo](https://example.com/photo.png)](https://example.com/target)\n\nText[^note]\n\n[^note]: Important footnote";
  await page.evaluate(writeDraftRecord, {
    key: "blog:writer:draft:recovery",
    raw: JSON.stringify({
      post: {
        id: "recovery",
        slug: "recovery",
        title: "Recovery draft",
        body,
        tags: [],
        category: { name: "Development", slug: "development" },
        coverImage: { src: "" },
        featured: false,
        published: false,
        createdAt: "2026-01-01T00:00:00Z",
        lastEditedAt: null,
        commentsCount: 0,
        reactionsCount: 0,
      },
      sha: null,
      savedAt: "2026-01-01T00:00:00Z",
      pinned: [
        {
          slug: "removed-pin",
          title: "Removed pin",
          coverImage: { src: "" },
        },
      ],
      order: ["removed-pin"],
    }),
  });
  await page.goto("/write?draft=recovery");
  const editor = page.getByRole("textbox", { name: "본문 편집기" });
  await expect(
    editor.locator('[data-footnote-reference="note"]'),
  ).toBeVisible();
  const definition = editor.locator('[data-footnote-definition="note"] p');
  await definition.click();
  await page.keyboard.press("End");
  await page.keyboard.type(" edited");
  await page.getByRole("button", { name: "임시 저장", exact: true }).click();
  await page.getByRole("button", { name: "내 고정 변경 반영" }).click();
  const dialog = page.getByRole("dialog", { name: "임시 저장" });
  await dialog.getByRole("button", { name: "임시 저장", exact: true }).click();
  await expect
    .poll(
      async () =>
        JSON.parse(
          (await page.evaluate(readDraftRecord, {
            key: "blog:writer:draft:recovery",
          }))!,
        ).post.body,
    )
    .toContain("Important footnote edited");
  const saved = JSON.parse(
    (await page.evaluate(readDraftRecord, {
      key: "blog:writer:draft:recovery",
    }))!,
  );
  expect(saved.post.body).toContain("https://example.com/target");
  expect(saved.post.body).toContain("[^note]:");
  expect(saved.order).not.toContain("removed-pin");
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(
    editor.locator('[data-footnote-definition="note"]'),
  ).toContainText("Important footnote edited");
  await page.getByRole("button", { name: "임시 저장", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "내 고정 변경 반영" }),
  ).toHaveCount(0);
});

test("damaged drafts remain downloadable and do not block new draft saves", async ({
  page,
}) => {
  await page.goto("/manage");
  await page.evaluate(writeDraftRecord, {
    key: "blog:writer:draft:post-20",
    raw: '{"body":"preserve me',
  });
  await page.getByRole("button", { name: "임시 저장", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "임시 저장", exact: true }).click();
  const recovery = page.getByRole("region", {
    name: "복구가 필요한 임시 저장본",
  });
  await expect(
    recovery.getByRole("link", { name: "원문 내려받기" }),
  ).toHaveAttribute("download", /\.json$/);
  await page.getByRole("link", { name: "글쓰기", exact: true }).click();
  await page.getByLabel("제목", { exact: true }).fill("Healthy new draft");
  await page
    .getByRole("textbox", { name: "본문 편집기" })
    .fill("Saved despite damaged neighbor");
  await page.getByRole("button", { name: "임시 저장", exact: true }).click();
  await page
    .getByRole("dialog", { name: "임시 저장" })
    .getByRole("button", { name: "임시 저장", exact: true })
    .click();
  await expect(page).toHaveURL(/draft=post-21$/);
  expect(
    await page.evaluate(readDraftRecord, { key: "blog:writer:draft:post-20" }),
  ).toBe('{"body":"preserve me');
  expect(
    JSON.parse(
      (await page.evaluate(readDraftRecord, {
        key: "blog:writer:draft:post-21",
      }))!,
    ).post.body,
  ).toBe("Saved despite damaged neighbor");
});
