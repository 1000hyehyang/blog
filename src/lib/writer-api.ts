import "server-only";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { ZodError } from "zod";
import { isWriter, sameOrigin } from "./writer-auth";
import { readLimitedResponseText } from "./limited-response";
import { PostStoreError } from "@/infrastructure/github/post-store";
import { POST_REQUEST_MAX_BYTES } from "@/domain/post";

export async function readWriterJson(
  request: Request,
  limit = POST_REQUEST_MAX_BYTES,
): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new PostStoreError("JSON 요청이 필요합니다.", 415);
  try {
    return JSON.parse(
      await readLimitedResponseText(
        new Response(request.body, { headers: request.headers }),
        limit,
      ),
    );
  } catch (error) {
    console.error("[writer] JSON request failed", {
      limitBytes: limit,
      reason:
        error instanceof SyntaxError
          ? "invalid-json"
          : error instanceof Error && error.message === "Response was too large"
            ? "request-size"
            : "request-read",
    });
    throw new PostStoreError("요청이 너무 크거나 올바르지 않습니다.", 400);
  }
}
export async function writerRequest(
  request: Request,
  action: () => Promise<unknown>,
) {
  if (!(await isWriter()))
    return NextResponse.json(
      {
        message:
          "로그인이 필요합니다. 내용을 복사해 보관한 뒤 다시 로그인해 주세요.",
      },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  if (!sameOrigin(request))
    return NextResponse.json(
      { message: "요청 출처를 확인할 수 없습니다." },
      { status: 403 },
    );
  try {
    return NextResponse.json(await action(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status =
      error instanceof PostStoreError
        ? error.status
        : error instanceof ZodError
          ? 400
          : 502;
    console.error("[writer] Action failed", {
      method: request.method,
      status,
      reason:
        error instanceof PostStoreError
          ? "storage"
          : error instanceof ZodError
            ? "validation"
            : "unexpected",
      ...(error instanceof ZodError && {
        fields: error.issues
          .map((issue) => issue.path[0])
          .filter((field) =>
            [
              "post",
              "body",
              "title",
              "sha",
              "pinned",
              "category",
              "series",
              "tags",
            ].includes(String(field)),
          ),
      }),
    });
    return NextResponse.json(
      {
        ...(error instanceof PostStoreError && error.conflict
          ? { conflict: error.conflict }
          : {}),
        message:
          error instanceof PostStoreError
            ? error.message
            : status === 400
              ? "입력값을 확인해 주세요."
              : "저장소 요청을 완료하지 못했습니다. 현재 내용을 보관하고 다시 시도해 주세요.",
      },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export function invalidatePosts() {
  revalidateTag("posts", { expire: 0 });
  revalidatePath("/", "page");
  revalidatePath("/posts", "page");
  revalidatePath("/[postId]", "page");
  revalidatePath("/category/[category]", "page");
  revalidatePath("/category/[category]/series/[series]", "page");
  revalidatePath("/manage", "page");
  revalidatePath("/write", "page");
  revalidatePath("/search", "page");
  revalidatePath("/sitemap.xml");
  revalidatePath("/feed.xml");
}
