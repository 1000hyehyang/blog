import { NextRequest } from "next/server";

import { fetchLinkPreviewImage } from "@/infrastructure/link-preview/link-preview";
import { verifyPreviewImage } from "@/lib/link-preview-signature";

const CACHE_SECONDS = 24 * 60 * 60;

function errorResponse(status: number) {
  return new Response(null, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET(request: NextRequest) {
  const parameters = request.nextUrl.searchParams;
  const url = parameters.get("url");
  const signature = parameters.get("signature");
  if (
    !url ||
    !signature ||
    [...parameters.keys()].length !== 2 ||
    !verifyPreviewImage(url, signature)
  )
    return errorResponse(403);

  try {
    const image = await fetchLinkPreviewImage(url);

    return new Response(image.body, {
      headers: {
        "Cache-Control": `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 7}`,
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Type": image.contentType,
        "Cross-Origin-Resource-Policy": "same-origin",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.warn("[link-preview] Failed to proxy a preview image.", error);
    return errorResponse(502);
  }
}
