import { z } from "zod";
import { deletePost, savePost } from "@/infrastructure/github/post-mutations";
import { slugSchema } from "@/lib/content/post-file";
import { pinnedOrderSchema } from "@/domain/pinned-posts";
import {
  createPostChunk,
  readPostTransfer,
} from "@/infrastructure/github/post-transfer";
import { PostStoreError } from "@/infrastructure/github/post-store";
import {
  POST_METADATA_MAX_BYTES,
  postTransferSchema,
} from "@/lib/post-transfer";
import {
  invalidatePosts,
  readWriterJson,
  writerRequest,
} from "@/lib/writer-api";
type Context = { params: Promise<{ slug: string }> };
export const maxDuration = 300;
const version = z.string().regex(/^[a-f0-9]{40}$/);
const postRequestSchema = z.object({
  post: z.object({ body: z.string() }).passthrough(),
  sha: version.nullable(),
  pinned: pinnedOrderSchema,
});

export async function POST(request: Request, context: Context) {
  return writerRequest(request, async () => {
    slugSchema.parse((await context.params).slug);
    const { chunk } = z
      .object({ chunk: z.string() })
      .parse(await readWriterJson(request));
    return createPostChunk(chunk);
  });
}

export async function PUT(request: Request, context: Context) {
  return writerRequest(request, async () => {
    const slug = slugSchema.parse((await context.params).slug);
    const input = z
      .union([postRequestSchema, postTransferSchema])
      .parse(await readWriterJson(request));
    const { post, sha, pinned } =
      "chunks" in input
        ? postRequestSchema.parse(await readPostTransfer(input.chunks))
        : input;
    if (
      Buffer.byteLength(
        JSON.stringify({ post: { ...post, body: "" }, sha, pinned }),
      ) > POST_METADATA_MAX_BYTES
    )
      throw new PostStoreError(
        "글 설정 정보가 너무 큽니다. 이미지 주소와 태그를 확인해 주세요.",
        400,
      );
    const result = await savePost(slug, post, sha, pinned);
    invalidatePosts();
    return { post: { ...result.post, body: undefined }, sha: result.sha };
  });
}
export async function DELETE(request: Request, context: Context) {
  return writerRequest(request, async () => {
    const slug = slugSchema.parse((await context.params).slug);
    const { sha } = z
      .object({ sha: version })
      .parse(await readWriterJson(request, 4096));
    await deletePost(slug, sha);
    invalidatePosts();
    return { deleted: true };
  });
}
