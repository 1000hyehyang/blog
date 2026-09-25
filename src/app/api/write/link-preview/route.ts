import { NextRequest, NextResponse } from "next/server";

import { getLinkPreview } from "@/infrastructure/link-preview/link-preview";
import { isWriter } from "@/lib/writer-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!(await isWriter())) return new Response(null, { status: 401 });
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return new Response(null, { status: 400 });
  const preview = await getLinkPreview(url);
  return preview
    ? NextResponse.json(preview)
    : new Response(null, { status: 400 });
}
