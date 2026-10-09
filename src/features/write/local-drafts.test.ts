import { afterEach, expect, it, vi } from "vitest";
import {
  readDraftRecord,
  writeDraftRecord,
} from "../../../tests/draft-storage";
import { POST_BODY_MAX_BYTES } from "@/domain/post";
import {
  readDrafts,
  readDraft,
  saveDraft,
  reservedDraftSlugs,
  removeDamagedDraft,
  removeDraft,
  readRecovery,
  saveRecovery,
  trackRecoveryWrite,
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
});

it("waits for an in-flight recovery save before reopening the editor", async () => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  }).then(() => saveRecovery("new", draft, null));
  trackRecoveryWrite("new", pending);
  const read = readRecovery("new");
  release();
  expect(await read).toEqual(draft);
});

it("preserves unfinished image URLs in recovery while keeping manual draft validation", async () => {
  await saveDraft(draft, null);
  await saveRecovery("new", draft, null);
  const edited = {
    ...draft,
    post: {
      ...draft.post,
      body: "Latest unsaved body",
      coverImage: { src: "https://" },
      galleryImage: { src: "unfinished" },
    },
    savedAt: "2026-01-01T00:00:01Z",
  };
  await saveRecovery("new", edited, draft.savedAt);
  expect(await readRecovery("new")).toEqual(edited);
  await expect(saveDraft(edited, draft.savedAt)).rejects.toThrow();
  expect(await readDraft(draft.post.slug)).toEqual(draft);
});

it("isolates invalid JSON, invalid schemas and mismatched IDs while preserving every raw value", async () => {
  await saveDraft(draft, null);
  const damaged = [
    { key: "blog:writer:draft:post-2", raw: "{" },
    { key: "blog:writer:draft:post-3", raw: "{}" },
    { key: "blog:writer:draft:post-4", raw: JSON.stringify(draft) },
    {
      key: "blog:writer:draft:post-6",
      raw: JSON.stringify({
        ...draft,
        post: { ...draft.post, slug: "post-6" },
        sha: "invalid-sha",
      }),
    },
    { key: "blog:writer:draft:invalid/key", raw: "" },
  ];
  for (const value of damaged) await writeDraftRecord(value);
  expect(await readDrafts()).toEqual({
    drafts: [draft],
    damaged: expect.arrayContaining(damaged),
  });
  expect(await reservedDraftSlugs()).toEqual([
    "post-1",
    "post-2",
    "post-3",
    "post-4",
    "post-6",
  ]);
  for (const { key, raw } of damaged)
    expect(await readDraftRecord({ key })).toBe(raw);
  await expect(
    saveDraft({ ...draft, post: { ...draft.post, slug: "post-2" } }, null),
  ).rejects.toThrow();
  await expect(
    saveDraft({ ...draft, post: { ...draft.post, slug: "post-3" } }, null),
  ).rejects.toThrow();
  await saveDraft({ ...draft, post: { ...draft.post, slug: "post-5" } }, null);
  expect((await readDraft("post-5"))?.post.body).toBe(draft.post.body);
});

it("does not conceal storage access failures and refuses deletion if the raw value changed", async () => {
  const damaged = { key: "blog:writer:draft:post-2", raw: "{" };
  await writeDraftRecord(damaged);
  const get = vi.spyOn(indexedDB, "open").mockImplementation(() => {
    throw new Error("access denied");
  });
  await expect(readDrafts()).rejects.toThrow("access denied");
  get.mockRestore();
  await writeDraftRecord({ key: damaged.key, raw: "new content" });
  await expect(removeDamagedDraft(damaged)).rejects.toThrow();
  expect(await readDraftRecord({ key: damaged.key })).toBe("new content");
  await removeDamagedDraft({ ...damaged, raw: "new content" });
  expect(await readDraftRecord({ key: damaged.key })).toBeNull();
  await expect(
    removeDamagedDraft({ key: "unrelated", raw: "" }),
  ).rejects.toThrow();
});

it("round trips a maximum-size draft and recovery copy without overwriting either", async () => {
  const large = {
    ...draft,
    post: { ...draft.post, body: "a".repeat(POST_BODY_MAX_BYTES) },
  };
  await saveDraft(large, null);
  await saveRecovery(
    "draft:post-1",
    {
      ...large,
      post: { ...large.post, title: "", body: large.post.body + "unsaved" },
    },
    null,
  );
  expect((await readDraft("post-1"))?.post.body).toBe(large.post.body);
  expect((await readRecovery("draft:post-1"))?.post.body).toBe(
    large.post.body + "unsaved",
  );
  await removeDraft("post-1", draft.savedAt);
  expect(await readDraft("post-1")).toBeNull();
  expect(await readRecovery("draft:post-1")).not.toBeNull();
});

it("serializes concurrent writes and rejects stale overwrite and deletion", async () => {
  const results = await Promise.allSettled([
    saveDraft(draft, null),
    saveDraft({ ...draft, savedAt: "2026-02-01T00:00:00Z" }, null),
  ]);
  expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(
    1,
  );
  const saved = (await readDraft("post-1"))!;
  await expect(removeDraft("post-1", "2025-01-01T00:00:00Z")).rejects.toThrow();
  expect(await readDraft("post-1")).toEqual(saved);
});
