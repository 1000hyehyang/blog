import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-shell grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="text-xs text-tertiary">404</p>
        <h1 className="mt-3 text-2xl font-semibold">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="mt-2 text-sm text-secondary">
          삭제되었거나 공개되지 않은 게시글일 수 있습니다.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex rounded-full border px-5 py-2.5 text-xs"
        >
          홈으로 이동
        </Link>
      </div>
    </div>
  );
}
