import { z } from "zod";
import { postFileSchema, slugSchema } from "@/lib/content/post-file";
const prefix = "blog:writer:draft:";
const draftSchema = z
  .object({
    post: postFileSchema,
    sha: z
      .union([z.string().regex(/^[a-f0-9]{40}$/), z.literal("local")])
      .nullable(),
    savedAt: z.string().datetime(),
    pinned: z.array(
      postFileSchema.pick({ slug: true, title: true, coverImage: true }),
    ),
    order: z.array(slugSchema),
  })
  .refine(
    ({ order }) => new Set(order).size === order.length,
    "Pinned 순서를 읽을 수 없습니다.",
  )
  .refine(({ post, pinned, order }) => {
    const known = new Set([post.slug, ...pinned.map(({ slug }) => slug)]);
    return order.every((slug) => known.has(slug));
  }, "Pinned 순서를 읽을 수 없습니다.");
export type LocalDraft = z.infer<typeof draftSchema>;
export type DamagedDraft = { key: string; raw: string };

function parseDraft(raw: string, id: string): LocalDraft {
  const draft = draftSchema.parse(JSON.parse(raw));
  if (draft.post.slug !== slugSchema.parse(id))
    throw new Error("임시 저장한 글을 읽을 수 없습니다.");
  return draft;
}

function draftKeys() {
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  return keys;
}

// An unreadable draft still owns its URL; never overwrite it with a new post.
export function reservedDraftSlugs(): string[] {
  return draftKeys()
    .map((key) => key.slice(prefix.length))
    .filter((slug) => slugSchema.safeParse(slug).success);
}

export function readDraft(id: string): LocalDraft | null {
  const raw = localStorage.getItem(prefix + slugSchema.parse(id));
  if (raw === null) return null;
  return parseDraft(raw, id);
}
export function readDrafts(): {
  drafts: LocalDraft[];
  damaged: DamagedDraft[];
} {
  const drafts: LocalDraft[] = [];
  const damaged: DamagedDraft[] = [];
  for (const key of draftKeys()) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try {
      drafts.push(parseDraft(raw, key.slice(prefix.length)));
    } catch {
      damaged.push({ key, raw });
    }
  }
  return { drafts, damaged };
}

export function removeDamagedDraft({ key, raw }: DamagedDraft) {
  if (!key.startsWith(prefix) || localStorage.getItem(key) !== raw)
    throw new Error("임시 저장본이 변경되었습니다. 다시 확인해 주세요.");
  localStorage.removeItem(key);
  window.dispatchEvent(new Event("writer-drafts"));
}
export function saveDraft(draft: LocalDraft, expected: string | null) {
  const value = draftSchema.parse(draft);
  if ((readDraft(value.post.slug)?.savedAt ?? null) !== expected)
    throw new Error(
      "다른 임시 저장본이 있습니다. 글 관리에서 확인해 주세요. 현재 작성 내용은 유지됩니다.",
    );
  localStorage.setItem(prefix + value.post.slug, JSON.stringify(value));
  window.dispatchEvent(new Event("writer-drafts"));
}
export function removeDraft(id: string, expected: string) {
  if (readDraft(id)?.savedAt !== expected)
    throw new Error("임시 저장본이 변경되었습니다. 다시 확인해 주세요.");
  localStorage.removeItem(prefix + id);
  window.dispatchEvent(new Event("writer-drafts"));
}
