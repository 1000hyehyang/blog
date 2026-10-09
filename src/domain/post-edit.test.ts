import { expect, it } from "vitest";
import { postFieldsSchema, type StoredPost } from "./post";
import { applyPostEdit, postValidationMessage } from "./post-edit";

const previous: StoredPost = {
  id: "existing-id",
  slug: "existing",
  title: "Title",
  body: "Original body",
  category: { slug: "essay", name: "Essay" },
  tags: ["one", "two"],
  coverImage: { src: "" },
  featured: false,
  published: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  publishedAt: null,
  lastEditedAt: null,
  commentsCount: 2,
  reactionsCount: 3,
};
const fields = postFieldsSchema.parse(previous);
const options = {
  slug: previous.slug,
  id: "new-id",
  now: "2026-02-01T00:00:00.000Z",
  categoryName: "Essay",
};

it("preserves identity and publication history across drafts, publishing and republishing", () => {
  const draft = applyPostEdit(null, fields, options);
  expect(draft).toMatchObject({
    id: "new-id",
    createdAt: options.now,
    publishedAt: null,
    lastEditedAt: null,
    commentsCount: 0,
    reactionsCount: 0,
  });
  const published = applyPostEdit(
    previous,
    { ...fields, published: true },
    options,
  );
  expect(published).toMatchObject({
    id: previous.id,
    createdAt: previous.createdAt,
    publishedAt: options.now,
    lastEditedAt: null,
    commentsCount: 2,
    reactionsCount: 3,
  });
  const later = { ...options, now: "2026-03-01T00:00:00.000Z" };
  const edited = applyPostEdit(
    published,
    { ...fields, body: "Edited body" },
    later,
  );
  expect(edited.lastEditedAt).toBe(later.now);
  expect(
    applyPostEdit(
      edited,
      { ...fields, body: "Edited body", published: true },
      options,
    ),
  ).toMatchObject({
    publishedAt: published.publishedAt,
    lastEditedAt: later.now,
  });
  const postWithoutPublicationDate = { ...previous, publishedAt: undefined };
  expect(
    applyPostEdit(postWithoutPublicationDate, fields, options).publishedAt,
  ).toBe(previous.createdAt);
});

it("only marks content edits and compares structured values without changing the input", () => {
  const published = {
    ...previous,
    published: true,
    publishedAt: previous.createdAt,
  };
  expect(
    applyPostEdit(
      published,
      { ...fields, published: true, featured: true, featuredOrder: 2 },
      options,
    ).lastEditedAt,
  ).toBeNull();
  expect(
    applyPostEdit(published, { ...fields, tags: [...fields.tags] }, options)
      .lastEditedAt,
  ).toBeNull();
  expect(
    applyPostEdit(published, { ...fields, tags: ["two", "one"] }, options)
      .lastEditedAt,
  ).toBe(options.now);
  expect(
    applyPostEdit(published, { ...fields, galleryImage: { src: "" } }, options)
      .lastEditedAt,
  ).toBe(options.now);
  expect(previous.lastEditedAt).toBeNull();
  expect(fields).not.toHaveProperty("publishedAt");
});

it("keeps publication validation messages and allows incomplete private drafts", () => {
  expect(
    postValidationMessage({ ...fields, body: " ", published: true }, []),
  ).toBe("본문을 입력해 주세요.");
  expect(postValidationMessage({ ...fields, body: " " }, [])).toBeNull();
  expect(postValidationMessage({ ...fields, series: "missing" }, [])).toBe(
    "카테고리에 등록된 시리즈를 선택해 주세요.",
  );
  expect(
    postValidationMessage({ ...fields, series: "life-updates" }, [
      { slug: "life-updates" },
    ]),
  ).toBeNull();
});
