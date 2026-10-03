import { expect, test } from "@playwright/test";
import { createTestSession } from "./writer-credentials";

test.beforeEach(async ({ page }) => {
  await page.context().addCookies([
    {
      name: "blog-writer",
      value: createTestSession(),
      url: "http://127.0.0.1:3100",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
});

test("recovers pinned state and preserves image links and editable footnotes in a reopened draft", async ({
  page,
}) => {
  await page.goto("/manage");
  const body =
    "[![photo](https://example.com/photo.png)](https://example.com/target)\n\nText[^note]\n\n[^note]: Important footnote";
  await page.evaluate((body) => {
    localStorage.setItem(
      "blog:writer:draft:recovery",
      JSON.stringify({
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
    );
  }, body);
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
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("blog:writer:draft:recovery")!).post
            .body,
      ),
    )
    .toContain("Important footnote edited");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("blog:writer:draft:recovery")!),
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
  await page.evaluate(() =>
    localStorage.setItem("blog:writer:draft:post-20", '{"body":"preserve me'),
  );
  await page.getByRole("button", { name: "임시 저장", exact: true }).click();
  // Opening the page again reads the same storage snapshot as a fresh session.
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
    await page.evaluate(() =>
      localStorage.getItem("blog:writer:draft:post-20"),
    ),
  ).toBe('{"body":"preserve me');
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("blog:writer:draft:post-21")!).post
          .body,
    ),
  ).toBe("Saved despite damaged neighbor");
});
