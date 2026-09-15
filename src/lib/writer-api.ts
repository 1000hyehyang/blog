import "server-only";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { ZodError } from "zod";
import { isWriter, sameOrigin } from "./writer-auth";
import { readLimitedResponseText } from "./limited-response";
import { PostStoreError } from "@/infrastructure/github/posts";

export async function readWriterJson(
  request: Request,
  limit = 300_000,
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
  } catch {
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
    return NextResponse.json(
      {
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
  revalidatePath("/posts/[slug]", "page");
  revalidatePath("/category/[category]", "page");
  revalidatePath("/search", "page");
  revalidatePath("/sitemap.xml");
  revalidatePath("/feed.xml");
}
