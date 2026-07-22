export default function Loading() {
  return (
    <div
      className="container-shell animate-pulse py-20"
      aria-label="콘텐츠 로딩 중"
    >
      <div className="h-10 w-64 rounded bg-muted" />
      <div className="mt-4 h-4 w-80 max-w-full rounded bg-muted" />
      <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="aspect-[4/3] rounded-[var(--radius-md)] bg-muted"
          />
        ))}
      </div>
    </div>
  );
}
