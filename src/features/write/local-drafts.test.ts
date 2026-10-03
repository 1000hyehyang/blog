import { afterEach, expect, it, vi } from "vitest";
import {
  readDrafts,
  readDraft,
  saveDraft,
  reservedDraftSlugs,
  removeDamagedDraft,
  type LocalDraft,
} from "./local-drafts";

const draft: LocalDraft = {
  post: {
    id: "id",
    slug: "post-1",
    title: "Saved",
    body: "Original body",
    category: { name: "Art", slug: "art" },
    tags: [],
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
};
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

it("isolates invalid JSON, invalid schemas and mismatched IDs while preserving every raw value", () => {
  saveDraft(draft, null);
  const damaged = [
    { key: "blog:writer:draft:post-2", raw: "{" },
    { key: "blog:writer:draft:post-3", raw: "{}" },
    { key: "blog:writer:draft:post-4", raw: JSON.stringify(draft) },
    { key: "blog:writer:draft:invalid/key", raw: "" },
  ];
  for (const { key, raw } of damaged) localStorage.setItem(key, raw);
  expect(readDrafts()).toEqual({ drafts: [draft], damaged });
  expect(reservedDraftSlugs()).toEqual([
    "post-1",
    "post-2",
    "post-3",
    "post-4",
  ]);
  for (const { key, raw } of damaged)
    expect(localStorage.getItem(key)).toBe(raw);
  expect(() =>
    saveDraft({ ...draft, post: { ...draft.post, slug: "post-2" } }, null),
  ).toThrow();
  saveDraft({ ...draft, post: { ...draft.post, slug: "post-5" } }, null);
  expect(readDraft("post-5")?.post.body).toBe(draft.post.body);
});

it("does not conceal storage access failures and refuses deletion if the raw value changed", () => {
  const damaged = { key: "blog:writer:draft:post-2", raw: "{" };
  localStorage.setItem(damaged.key, damaged.raw);
  const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("access denied");
  });
  expect(() => readDrafts()).toThrow("access denied");
  get.mockRestore();
  localStorage.setItem(damaged.key, "new content");
  expect(() => removeDamagedDraft(damaged)).toThrow();
  expect(localStorage.getItem(damaged.key)).toBe("new content");
  removeDamagedDraft({ ...damaged, raw: "new content" });
  expect(localStorage.getItem(damaged.key)).toBeNull();
  expect(() => removeDamagedDraft({ key: "unrelated", raw: "" })).toThrow();
});
