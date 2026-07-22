"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="page-shell grid min-h-[60vh] place-items-center text-center">
      <div>
        <h1 className="text-2xl font-semibold">콘텐츠를 불러오지 못했습니다</h1>
        <p className="mt-2 text-sm text-secondary">
          잠시 후 다시 시도해 주세요.
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-full border px-5 py-2.5 text-xs"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
