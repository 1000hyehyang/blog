import { z } from "zod";
import { deletePost, savePost } from "@/infrastructure/github/posts";
import { slugSchema } from "@/lib/content/post-file";
import { pinnedOrderSchema } from "@/features/write/pinned-posts";
import {
  invalidatePosts,
  readWriterJson,
  writerRequest,
} from "@/lib/writer-api";
type Context = { params: Promise<{ slug: string }> };
const version = z.string().regex(/^[a-f0-9]{40}$/);

export async function PUT(request: Request, context: Context) {
  return writerRequest(request, async () => {
    const slug = slugSchema.parse((await context.params).slug);
    const { post, sha, pinned } = z
      .object({
        post: z.unknown(),
        sha: version.nullable(),
        pinned: pinnedOrderSchema.optional(),
      })
      .parse(await readWriterJson(request));
    const result = await savePost(slug, post, sha, pinned);
    invalidatePosts();
    return result;
  });
}
export async function DELETE(request: Request, context: Context) {
  return writerRequest(request, async () => {
    const slug = slugSchema.parse((await context.params).slug);
    const { sha } = z
      .object({ sha: version })
      .parse(await readWriterJson(request));
    await deletePost(slug, sha);
    invalidatePosts();
    return { deleted: true };
  });
}
