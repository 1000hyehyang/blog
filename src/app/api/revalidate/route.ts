import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

function authorized(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const token = request.headers.get("authorization");
  return Boolean(secret && token === `Bearer ${secret}`);
}

type RevalidateBody = {
  number?: number;
};

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { message: "인증할 수 없습니다." },
      { status: 401 },
    );
  }

  let number: number | undefined;
  try {
    const body = (await request.json()) as RevalidateBody;
    if (Number.isInteger(body?.number) && (body?.number ?? 0) > 0) {
      number = body.number;
    }
  } catch {
    // 본문 없이 호출해도 전체 posts 태그는 갱신한다.
  }

  revalidateTag("posts", "max");
  if (number) {
    revalidateTag(`post:${number}`, "max");
    revalidatePath(`/posts/${number}`, "page");
  }

  // revalidateTag만으로는 상세 페이지 Full Route / Router Cache가 남을 수 있다.
  revalidatePath("/", "page");
  revalidatePath("/posts", "page");
  revalidatePath("/posts/[number]", "page");
  revalidatePath("/category/[category]", "page");

  return NextResponse.json({
    revalidated: true,
    number: number ?? null,
    now: new Date().toISOString(),
  });
}
