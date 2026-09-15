import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isWriter, sameOrigin } from "@/lib/writer-auth";
import { readWriterJson } from "@/lib/writer-api";

export async function POST(request: Request) {
  try {
    const body = (await readWriterJson(request, 16_000)) as HandleUploadBody;
    if (body?.type === "blob.generate-client-token") {
      if (!(await isWriter()))
        return NextResponse.json(
          { message: "로그인이 필요합니다." },
          { status: 401 },
        );
      if (!sameOrigin(request))
        return NextResponse.json(
          { message: "요청 출처를 확인할 수 없습니다." },
          { status: 403 },
        );
    } else if (body?.type !== "blob.upload-completed")
      return NextResponse.json(
        { message: "잘못된 요청입니다." },
        { status: 400 },
      );
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!(await isWriter()) || !sameOrigin(request))
          throw new Error("Unauthorized");
        if (
          !/^posts\/[a-f0-9-]{36}\.(png|jpg|jpeg|gif|webp|avif)$/.test(pathname)
        )
          throw new Error("Invalid image path");
        return {
          allowedContentTypes: [
            "image/png",
            "image/jpeg",
            "image/gif",
            "image/webp",
            "image/avif",
          ],
          maximumSizeInBytes: 8 * 1024 * 1024,
          addRandomSuffix: true,
          validUntil: Date.now() + 5 * 60 * 1000,
        };
      },
      // The SDK verifies the callback signature; it does not carry the administrator cookie.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        message:
          "이미지 업로드를 승인하지 못했습니다. 로그인과 Blob 설정을 확인해 주세요.",
      },
      { status: 400 },
    );
  }
}
