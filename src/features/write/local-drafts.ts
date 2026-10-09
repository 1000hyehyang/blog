import { z } from "zod";
import { postFileSchema, slugSchema } from "@/lib/content/post-file";
const prefix = "blog:writer:draft:";
const draftSchema = z
  .object({
    post: postFileSchema,
    sha: z
      .string()
      .regex(/^[a-f0-9]{40}$/)
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
const recoverySchema = draftSchema.safeExtend({
  post: postFileSchema.extend({
    title: z.string(),
    body: z.string(),
    tags: z.array(z.string()),
    coverImage: z.object({ src: z.string() }),
    galleryImage: z.object({ src: z.string() }).optional(),
  }),
});
export type DamagedDraft = { key: string; raw: string };
const recoveryWrites = new Map<string, Promise<unknown>>();

export function trackRecoveryWrite(key: string, pending: Promise<unknown>) {
  recoveryWrites.set(key, pending);
  const complete = () => {
    if (recoveryWrites.get(key) === pending) recoveryWrites.delete(key);
  };
  void pending.then(complete, complete);
}

function parseDraft(raw: string, id: string): LocalDraft {
  const draft = draftSchema.parse(JSON.parse(raw));
  if (draft.post.slug !== slugSchema.parse(id))
    throw new Error("임시 저장한 글을 읽을 수 없습니다.");
  return draft;
}

function withStore<T>(
  name: "drafts" | "recovery",
  mode: IDBTransactionMode,
  action: (
    store: IDBObjectStore,
    result: (value: T) => void,
    check: <R>(request: IDBRequest<R>, action: (value: R) => void) => void,
  ) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("blog-writer", 1);
    open.onupgradeneeded = () => {
      open.result.createObjectStore("drafts");
      open.result.createObjectStore("recovery");
    };
    open.onerror = () => reject(open.error);
    let blocked = false;
    open.onblocked = () => {
      blocked = true;
      reject(
        new Error(
          "임시 저장소를 열지 못했습니다. 다른 편집 창을 닫고 다시 시도해 주세요.",
        ),
      );
    };
    open.onsuccess = () => {
      const db = open.result;
      if (blocked) {
        db.close();
        return;
      }
      let transaction: IDBTransaction;
      try {
        transaction = db.transaction(name, mode);
      } catch (error) {
        db.close();
        reject(error);
        return;
      }
      let value: T;
      let failure: unknown;
      transaction.oncomplete = () => {
        db.close();
        resolve(value);
      };
      transaction.onabort = () => {
        db.close();
        reject(
          failure ??
            transaction.error ??
            new Error("임시 저장을 완료하지 못했습니다."),
        );
      };
      try {
        action(
          transaction.objectStore(name),
          (result) => {
            value = result;
          },
          (request, callback) => {
            request.onsuccess = () => {
              try {
                callback(request.result);
              } catch (error) {
                failure = error;
                transaction.abort();
              }
            };
          },
        );
      } catch (error) {
        transaction.abort();
        reject(error);
      }
    };
  });
}

// 손상된 임시 저장본도 새 글로 덮어쓰지 않도록 주소를 예약한다.
export async function reservedDraftSlugs(): Promise<string[]> {
  const keys = await withStore<IDBValidKey[]>(
    "drafts",
    "readonly",
    (store, done, checkRequest) => {
      checkRequest(store.getAllKeys(), done);
    },
  );
  return keys
    .map(String)
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length))
    .filter((slug) => slugSchema.safeParse(slug).success);
}

export async function readDraft(id: string): Promise<LocalDraft | null> {
  const raw = await withStore<string | undefined>(
    "drafts",
    "readonly",
    (store, done, checkRequest) => {
      checkRequest(store.get(prefix + slugSchema.parse(id)), done);
    },
  );
  if (raw === undefined) return null;
  return parseDraft(raw, id);
}
export async function readDrafts(): Promise<{
  drafts: LocalDraft[];
  damaged: DamagedDraft[];
}> {
  const drafts: LocalDraft[] = [];
  const damaged: DamagedDraft[] = [];
  const entries = await withStore<{ key: string; raw: string }[]>(
    "drafts",
    "readonly",
    (store, done, checkRequest) => {
      const values: { key: string; raw: string }[] = [];
      const cursor = store.openCursor();
      checkRequest(cursor, (entry) => {
        if (!entry) {
          done(values);
          return;
        }
        const key = String(entry.key);
        if (key.startsWith(prefix)) values.push({ key, raw: entry.value });
        entry.continue();
      });
    },
  );
  for (const { key, raw } of entries) {
    try {
      drafts.push(parseDraft(raw, key.slice(prefix.length)));
    } catch {
      damaged.push({ key, raw });
    }
  }
  return { drafts, damaged };
}

export async function removeDamagedDraft({ key, raw }: DamagedDraft) {
  await withStore<void>("drafts", "readwrite", (store, done, checkRequest) => {
    const request = store.get(key);
    checkRequest(request, (current) => {
      if (!key.startsWith(prefix) || current !== raw)
        throw new Error("임시 저장본이 변경되었습니다. 다시 확인해 주세요.");
      store.delete(key);
      done();
    });
  });
  notifyDrafts();
}
export async function saveDraft(draft: LocalDraft, expected: string | null) {
  const value = draftSchema.parse(draft);
  await writeVersion("drafts", prefix + value.post.slug, value, expected);
  notifyDrafts();
}
export async function removeDraft(id: string, expected: string) {
  await writeVersion("drafts", prefix + slugSchema.parse(id), null, expected);
  notifyDrafts();
}

function notifyDrafts() {
  window.dispatchEvent(new Event("writer-drafts"));
  if (typeof BroadcastChannel !== "undefined") {
    try {
      const channel = new BroadcastChannel("writer-drafts");
      channel.postMessage(null);
      channel.close();
    } catch {
      // 다른 창에 알리지 못해도 완료된 저장은 유지한다.
    }
  }
}

function writeVersion(
  name: "drafts" | "recovery",
  key: string,
  value: LocalDraft | null,
  expected: string | null,
) {
  return withStore<void>(name, "readwrite", (store, done, checkRequest) => {
    checkRequest(store.get(key), (raw: string | undefined) => {
      const current =
        raw === undefined
          ? null
          : name === "drafts"
            ? parseDraft(raw, key.slice(prefix.length))
            : recoverySchema.parse(JSON.parse(raw));
      if ((current?.savedAt ?? null) !== expected)
        throw new Error(
          "임시 저장본이 변경되었습니다. 글 관리에서 확인해 주세요. 현재 작성 내용은 유지됩니다.",
        );
      if (value) store.put(JSON.stringify(value), key);
      else store.delete(key);
      done();
    });
  });
}
export async function readRecovery(key: string): Promise<LocalDraft | null> {
  await recoveryWrites.get(key);
  const raw = await withStore<string | undefined>(
    "recovery",
    "readonly",
    (store, done, checkRequest) => {
      checkRequest(store.get(key), done);
    },
  );
  return raw === undefined ? null : recoverySchema.parse(JSON.parse(raw));
}
export async function saveRecovery(
  key: string,
  value: LocalDraft,
  expected: string | null,
) {
  await writeVersion("recovery", key, recoverySchema.parse(value), expected);
}
export async function removeRecovery(key: string, expected: string) {
  await writeVersion("recovery", key, null, expected);
}
