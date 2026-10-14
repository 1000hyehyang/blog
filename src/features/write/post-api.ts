import { z } from "zod";
import {
  storedPostSchema,
  postFieldsSchema,
  POST_REQUEST_MAX_BYTES,
  type PostFields,
  type StoredPost,
} from "@/domain/post";
import type { PinnedOrder } from "@/domain/pinned-posts";
import {
  POST_CHUNK_MAX_BYTES,
  POST_HTTP_MAX_BYTES,
  POST_METADATA_MAX_BYTES,
} from "@/lib/post-transfer";

const savedPostSchema = z.object({
  post: storedPostSchema.omit({ body: true }),
  sha: z.string().regex(/^[a-f0-9]{40}$/),
});
const errorSchema = z.object({
  message: z.string().optional(),
  conflict: z.unknown().optional(),
});
export const postConflictSchema = z.object({
  kind: z.literal("post"),
  sha: z
    .string()
    .regex(/^[a-f0-9]{40}$/)
    .nullable(),
  id: z.string().nullable(),
});
type SaveResult =
  | { ok: true; post: StoredPost; sha: string }
  | { ok: false; status: number; message: string; conflict?: unknown };

async function readPostResponse(
  response: Response,
  fallback = "저장소 요청을 완료하지 못했습니다. 작성 내용은 유지됩니다. 다시 시도해 주세요.",
) {
  const data: unknown = await response.json().catch(() => null);
  if (response.ok) return { ok: true as const, data };
  const error = errorSchema.safeParse(data);
  return {
    ok: false as const,
    status: response.status,
    message:
      response.status === 413
        ? "전송할 글이 서버의 요청 한도를 넘었습니다. 작성 내용은 유지됩니다."
        : (error.success && error.data.message) || fallback,
    conflict: error.success ? error.data.conflict : undefined,
  };
}

export async function savePostRequest(
  slug: string,
  post: PostFields & { id: string },
  sha: string | null,
  pinned: PinnedOrder,
): Promise<SaveResult> {
  if (!postFieldsSchema.shape.body.safeParse(post.body).success)
    throw new Error("본문은 UTF-8 기준 5 MiB까지 저장할 수 있습니다.");
  const encoder = new TextEncoder();
  if (
    encoder.encode(JSON.stringify({ post: { ...post, body: "" }, sha, pinned }))
      .byteLength > POST_METADATA_MAX_BYTES
  )
    throw new Error(
      "글 설정 정보가 너무 큽니다. 이미지 주소와 태그를 확인해 주세요.",
    );
  let body = JSON.stringify({ post, sha, pinned });
  const bytes = encoder.encode(body);
  if (bytes.byteLength > POST_REQUEST_MAX_BYTES)
    throw new Error("전송할 글이 너무 큽니다. 작성 내용은 유지됩니다.");
  const endpoint = `/api/write/posts/${encodeURIComponent(slug)}`;
  if (bytes.byteLength > POST_HTTP_MAX_BYTES) {
    const chunks: string[] = [];
    const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
    for (let start = 0; start < bytes.length;) {
      let end = Math.min(start + POST_CHUNK_MAX_BYTES, bytes.length);
      while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
      const response = await readPostResponse(
        await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chunk: decoder.decode(bytes.subarray(start, end)),
          }),
        }),
      );
      if (!response.ok) return response;
      const chunk = z
        .object({ sha: z.string().regex(/^[a-f0-9]{40}$/) })
        .safeParse(response.data);
      if (!chunk.success)
        throw new Error(
          "글 전송을 확인하지 못했습니다. 작성 내용은 유지됩니다.",
        );
      chunks.push(chunk.data.sha);
      start = end;
    }
    body = JSON.stringify({ chunks });
  }
  const response = await readPostResponse(
    await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    }),
  );
  if (!response.ok) return response;
  const result = savedPostSchema.safeParse(response.data);
  if (!result.success)
    throw new Error(
      "저장에 실패했습니다. 작성 내용은 유지됩니다. 다시 시도해 주세요.",
    );
  return {
    ok: true,
    ...result.data,
    post: { ...result.data.post, body: post.body },
  };
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
  const result = await readPostResponse(
    response,
    fallback ?? "글을 삭제하지 못했습니다.",
  );
  if (!result.ok) throw new Error(result.message);
}
