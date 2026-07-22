import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

function authorized(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const token = request.headers.get("authorization");
  return Boolean(secret && token === `Bearer ${secret}`);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { message: "인증할 수 없습니다." },
      { status: 401 },
    );
  }
  revalidateTag("posts", "max");
  return NextResponse.json({
    revalidated: true,
    now: new Date().toISOString(),
  });
}
