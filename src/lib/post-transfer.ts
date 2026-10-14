import { z } from "zod";
import { POST_REQUEST_MAX_BYTES } from "@/domain/post";

// Leave room below Vercel's 4.5 MB limit, including JSON escaping of chunks.
export const POST_HTTP_MAX_BYTES = 4_000_000;
export const POST_CHUNK_MAX_BYTES = 1_900_000;
export const POST_METADATA_MAX_BYTES = 128 * 1024;

export const postTransferSchema = z.object({
  chunks: z
    .array(z.string().regex(/^[a-f0-9]{40}$/))
    .min(1)
    .max(Math.ceil(POST_REQUEST_MAX_BYTES / (POST_CHUNK_MAX_BYTES - 3))),
});
