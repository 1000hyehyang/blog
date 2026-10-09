import { issueSignedToken } from "@vercel/blob";
import {
  handleUploadPresigned,
  type GeneratePresignedUrlEvent,
} from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isWriter, sameOrigin } from "@/lib/writer-auth";
import { readWriterJson } from "@/lib/writer-api";
import { IMAGE_UPLOAD_TYPES, MAX_IMAGE_UPLOAD_BYTES } from "@/config/images";

export async function POST(request: Request) {
  try {
    const body = (await readWriterJson(
      request,
      16_000,
    )) as GeneratePresignedUrlEvent;
    if (body?.type !== "blob.generate-presigned-url")
      return NextResponse.json(
        { message: "잘못된 요청입니다." },
        { status: 400 },
      );
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
    const result = await handleUploadPresigned({
      request,
      body,
      getSignedToken: async (pathname) => {
        if (
          !/^posts\/[a-z0-9-]+\/[a-zA-Z0-9_-]{1,100}\/[a-f0-9-]{36}\.(png|jpg|jpeg|gif|webp|avif)$/.test(
            pathname,
          )
        )
          throw new Error("Invalid image path");
        return {
          token: await issueSignedToken({
            pathname,
            operations: ["put"],
            allowedContentTypes: IMAGE_UPLOAD_TYPES,
            maximumSizeInBytes: MAX_IMAGE_UPLOAD_BYTES,
            validUntil: Date.now() + 5 * 60 * 1000,
          }),
          urlOptions: { addRandomSuffix: true },
        };
      },
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
