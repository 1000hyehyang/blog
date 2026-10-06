import Link from "next/link";

import { routes } from "@/lib/routes";

export default function PostNotFound() {
  return (
    <div className="page-shell grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="section-label">404</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="mt-2 text-sm text-secondary">
          삭제되었거나 공개되지 않은 포스트일 수 있습니다.
        </p>
        <Link
          href={routes.posts}
          className="mt-7 inline-flex rounded-full border px-5 py-2.5 text-xs"
        >
          포스트 목록으로 이동
        </Link>
      </div>
    </div>
  );
}
