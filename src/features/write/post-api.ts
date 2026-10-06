import { z } from "zod";
import {
  storedPostSchema,
  type PostFields,
  type StoredPost,
} from "@/domain/post";
import type { PinnedOrder } from "@/domain/pinned-posts";

const savedPostSchema = z.object({
  post: storedPostSchema.passthrough(),
  sha: z.string().regex(/^[a-f0-9]{40}$/),
});
const errorSchema = z.object({
  message: z.string().optional(),
  conflict: z.unknown().optional(),
});
type SaveResult =
  | { ok: true; post: StoredPost; sha: string }
  | { ok: false; status: number; message?: string; conflict?: unknown };

export async function savePostRequest(
  slug: string,
  post: PostFields & { id: string },
  sha: string | null,
  pinned: PinnedOrder,
): Promise<SaveResult> {
  const response = await fetch(`/api/write/posts/${encodeURIComponent(slug)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ post, sha, pinned }),
  });
  const data: unknown = await response.json();
  if (!response.ok)
    return { ok: false, status: response.status, ...errorSchema.parse(data) };
  const result = savedPostSchema.safeParse(data);
  if (!result.success)
    throw new Error(
      "저장에 실패했습니다. 작성 내용은 유지됩니다. 다시 시도해 주세요.",
    );
  return { ok: true, ...result.data };
}

export async function deletePostRequest(
  slug: string,
  sha: string,
  fallback?: string,
) {
  const response = await fetch(`/api/write/posts/${encodeURIComponent(slug)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sha }),
  });
  const data: unknown = await response.json();
  if (!response.ok)
    throw new Error(errorSchema.parse(data).message ?? fallback);
}
