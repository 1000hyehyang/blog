import { NextRequest } from "next/server";

import {
  fetchLinkPreviewImage,
  getLinkPreview,
} from "@/infrastructure/link-preview/link-preview";

export const runtime = "nodejs";

const CACHE_SECONDS = 24 * 60 * 60;

function errorResponse(status: number) {
  return new Response(null, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET(request: NextRequest) {
  const pageUrl = request.nextUrl.searchParams.get("url");
  if (!pageUrl) return errorResponse(400);

  const preview = await getLinkPreview(pageUrl);
  if (!preview?.image) return errorResponse(404);

  try {
    const image = await fetchLinkPreviewImage(preview.image);

    return new Response(image.body, {
      headers: {
        "Cache-Control": `public, max-age=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 7}`,
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Type": image.contentType,
        "Cross-Origin-Resource-Policy": "same-origin",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return errorResponse(502);
  }
}
