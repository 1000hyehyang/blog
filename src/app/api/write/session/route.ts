import { NextResponse } from "next/server";
import { z } from "zod";
import {
  allowLoginAttempt,
  sameOrigin,
  SESSION_COOKIE,
  sessionCookieOptions,
  writerConfigured,
} from "@/lib/writer-auth";
import { readWriterJson } from "@/lib/writer-api";
import {
  createGitHubLogin,
  OAUTH_COOKIE,
  oauthCookieOptions,
} from "@/lib/writer-github-oauth";

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { message: "요청 출처를 확인할 수 없습니다." },
      { status: 403 },
    );
  if (!writerConfigured())
    return NextResponse.json(
      { message: "관리자 인증 설정이 필요합니다." },
      { status: 503 },
    );
  if (!allowLoginAttempt(request))
    return NextResponse.json(
      { message: "잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  let next: string;
  try {
    ({ next } = z
      .object({ next: z.string().max(512) })
      .strict()
      .parse(await readWriterJson(request, 4096)));
  } catch {
    return NextResponse.json(
      { message: "잘못된 요청입니다." },
      { status: 400 },
    );
  }
  const login = createGitHubLogin(next);
  const response = NextResponse.json(
    { url: login.url },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(OAUTH_COOKIE, login.cookie, oauthCookieOptions);
  return response;
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { message: "요청 출처를 확인할 수 없습니다." },
      { status: 403 },
    );
  const response = NextResponse.json(
    { authenticated: false },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions,
    maxAge: 0,
  });
  response.cookies.set(OAUTH_COOKIE, "", { ...oauthCookieOptions, maxAge: 0 });
  return response;
}
