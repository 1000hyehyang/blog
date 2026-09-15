import { NextResponse } from "next/server";
import {
  allowLoginAttempt,
  createWriterSession,
  sameOrigin,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyWriterPassword,
  writerConfigured,
} from "@/lib/writer-auth";
import { readWriterJson } from "@/lib/writer-api";

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
  if (!allowLoginAttempt())
    return NextResponse.json(
      { message: "잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  let password: unknown;
  try {
    password = ((await readWriterJson(request, 4096)) as { password?: unknown })
      ?.password;
  } catch {
    return NextResponse.json(
      { message: "잘못된 요청입니다." },
      { status: 400 },
    );
  }
  if (typeof password !== "string" || !(await verifyWriterPassword(password)))
    return NextResponse.json(
      { message: "비밀번호를 확인해 주세요." },
      { status: 401 },
    );
  const response = NextResponse.json(
    { authenticated: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(
    SESSION_COOKIE,
    createWriterSession(),
    sessionCookieOptions,
  );
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
  return response;
}
