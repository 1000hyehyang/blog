import { readFileSync } from "node:fs";
import { expect, test, type Locator } from "@playwright/test";
import { createTestSession } from "./writer-credentials";

const body = readFileSync("tests/fixtures/posts/post-8.md", "utf8").replace(
  /^---\r?\n[\s\S]*?\r?\n---\r?\n/,
  "",
);

async function appearance(root: Locator, editing: boolean) {
  return root.evaluate(async (element, editing) => {
    await Promise.all(
      Array.from(
        element.querySelectorAll(".content-image-block img"),
        async (node) => {
          const image = node as HTMLImageElement;
          image.loading = "eager";
          await image.decode();
        },
      ),
    );
    // 페이지 여백의 영향을 제외하고 같은 본문 폭에서 비교한다.
    element.style.width = `${Math.min(window.innerWidth - 48, 600)}px`;
    const selectors = {
      paragraph: ":scope > p:not(.content-image-block)",
      headings: editing ? "h1,h2,h3,h4,h5,h6" : ".markdown-heading",
      quote: "blockquote",
      quoteParagraphs: "blockquote > p",
      listParagraphs: "li p",
      checkboxLabels: 'li[data-type="taskItem"] > label',
      inline: editing ? "p > code" : ".markdown-inline-code",
      code: "pre",
      cells: "th,td",
      rule: "hr",
      images: ".content-image-block img",
      captions: ".markdown-image-caption",
    };
    return Object.fromEntries(
      Object.entries(selectors).map(([key, selector]) => [
        key,
        Array.from(element.querySelectorAll<HTMLElement>(selector)).map(
          (node) => {
            const style = getComputedStyle(node);
            const bounds = node.getBoundingClientRect();
            if (key === "images")
              return {
                width: Math.round(bounds.width),
                height: Math.round(bounds.height),
                left: Math.round(
                  bounds.left - element.getBoundingClientRect().left,
                ),
              };
            return {
              text:
                key === "checkboxLabels"
                  ? ""
                  : key === "quote"
                    ? node.textContent?.replace(/\s/g, "")
                    : node.textContent?.replace(/\u00a0/g, "").trim(),
              font: style.fontFamily,
              size: style.fontSize,
              weight: style.fontWeight,
              color: style.color,
              lineHeight: style.lineHeight,
              letterSpacing: style.letterSpacing,
              padding: style.padding,
              margin:
                key === "code" && !editing
                  ? getComputedStyle(node.closest(".markdown-code-block")!)
                      .margin
                  : style.margin,
              border: style.borderLeft,
              background: style.backgroundColor,
              height: Math.round(node.getBoundingClientRect().height),
              width: Math.round(node.getBoundingClientRect().width),
            };
          },
        ),
      ]),
    );
  }, editing);
}

for (const theme of ["light", "dark"]) {
  test(`editor and published content share typography and spacing (${theme})`, async ({
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
    await page.addInitScript(
      (theme) => localStorage.setItem("theme", theme),
      theme,
    );
    await page.goto("/fixture-id-8");
    const published = page.locator("article .prose:visible");
    await expect(published.locator("pre")).toBeVisible();
    // ImageViewer가 hydration을 마친 뒤 크기를 측정한다.
    await expect(
      published.getByRole("button", { name: "사진 확대 보기", exact: true }),
    ).toBeAttached();
    await page.evaluate(() => document.fonts.ready);
    const expected = await appearance(published, false);

    await page.evaluate((body) => {
      localStorage.setItem(
        "blog:writer:draft:parity",
        JSON.stringify({
          post: {
            id: "parity",
            slug: "parity",
            title: "Rendering parity",
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
          pinned: [],
          order: [],
        }),
      );
    }, body);
    await page.goto("/write?draft=parity");
    const editor = page.getByRole("textbox", { name: "본문 편집기" });
    await expect(editor.locator("pre")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const actual = await appearance(editor, true);
    if (isMobile) {
      // 65%로 저장한 사진은 모바일 발행 화면에서만 75.5%로 표시한다.
      const imageWidth = Math.round((page.viewportSize()!.width - 48) * 0.755);
      expect(expected).toEqual({
        ...actual,
        images: [
          actual.images[0],
          { ...actual.images[1], width: imageWidth, height: imageWidth },
        ],
        captions: [{ ...actual.captions[0], width: imageWidth }],
      });
    } else {
      expect(actual).toEqual(expected);
    }
  });
}
