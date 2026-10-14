import "server-only";
import { POST_REQUEST_MAX_BYTES } from "@/domain/post";
import { gitShaSchema } from "@/lib/content/post-index";
import { POST_CHUNK_MAX_BYTES } from "@/lib/post-transfer";
import {
  gitJson,
  PostStoreError,
  readBlob,
  usesGitHubStorage,
} from "./post-store";

export async function createPostChunk(chunk: string) {
  if (!usesGitHubStorage())
    throw new PostStoreError("GitHub 글쓰기 설정이 필요합니다.", 503);
  if (!chunk || Buffer.byteLength(chunk) > POST_CHUNK_MAX_BYTES)
    throw new PostStoreError(
      "전송할 글 조각이 너무 크거나 비어 있습니다.",
      400,
    );
  const result = await gitJson("/git/blobs", {
    method: "POST",
    body: JSON.stringify({ content: chunk, encoding: "utf-8" }),
  });
  return { sha: gitShaSchema.parse(result.sha) };
}

export async function readPostTransfer(chunks: string[]): Promise<unknown> {
  const parts: string[] = [];
  let bytes = 0;
  for (const sha of chunks) {
    const content = await readBlob(sha, POST_CHUNK_MAX_BYTES);
    bytes += Buffer.byteLength(content);
    if (bytes > POST_REQUEST_MAX_BYTES)
      throw new PostStoreError("전송한 글이 너무 큽니다.", 400);
    parts.push(content);
  }
  try {
    return JSON.parse(parts.join(""));
  } catch {
    throw new PostStoreError(
      "전송한 글을 읽을 수 없습니다. 다시 시도해 주세요.",
      400,
    );
  }
}
