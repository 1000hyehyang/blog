import { NextRequest, NextResponse } from "next/server";
import {
  createWriterSession,
  SESSION_COOKIE,
  sessionCookieOptions,
  writerConfigured,
  writerOrigin,
} from "@/lib/writer-auth";
import {
  OAUTH_COOKIE,
  oauthCookieOptions,
  verifyGitHubFlow,
  verifyGitHubOwner,
} from "@/lib/writer-github-oauth";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const headers = {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  };
  if (!writerConfigured()) {
    const response = NextResponse.json(
      { message: "관리자 인증 설정이 필요합니다." },
      { status: 503, headers },
    );
    response.cookies.set(OAUTH_COOKIE, "", {
      ...oauthCookieOptions,
      maxAge: 0,
    });
    return response;
  }
  const flow =
    query.getAll("state").length === 1
      ? verifyGitHubFlow(
          request.cookies.get(OAUTH_COOKIE)?.value,
          query.get("state"),
        )
      : null;
  let authenticated = false;
  if (flow && !query.has("error") && query.getAll("code").length === 1) {
    try {
      authenticated = await verifyGitHubOwner(
        query.get("code")!,
        flow.verifier,
      );
    } catch {
      // Provider errors must not disclose codes, tokens or client secrets.
    }
  }
  let response: NextResponse;
  if (authenticated && flow) {
    // A same-site navigation makes the existing Strict session cookie available after OAuth.
    response = new NextResponse(
      `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${flow.next}"><title>로그인 완료</title></head><body><a href="${flow.next}">계속</a></body></html>`,
      {
        headers: {
          ...headers,
          "Content-Type": "text/html; charset=utf-8",
          "Content-Security-Policy":
            "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
    response.cookies.set(
      SESSION_COOKIE,
      createWriterSession(),
      sessionCookieOptions,
    );
  } else {
    const url = new URL("/login", writerOrigin()!);
    url.search = new URLSearchParams({
      error: "github",
      next: flow?.next ?? "/manage",
    }).toString();
    response = NextResponse.redirect(url, { status: 303, headers });
  }
  response.cookies.set(OAUTH_COOKIE, "", { ...oauthCookieOptions, maxAge: 0 });
  return response;
}
