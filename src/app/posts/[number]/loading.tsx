const BODY_LINE_WIDTHS = ["w-full", "w-11/12", "w-10/12", "w-full", "w-9/12", "w-full", "w-8/12"];
const TOC_LINE_WIDTHS = ["w-24", "w-32", "w-28", "w-36", "w-20"];

export default function PostDetailLoading() {
  return (
    <article
      className="page-shell page-shell--detail animate-pulse"
      aria-label="포스트 로딩 중"
    >
      <div className="mx-auto grid max-w-[var(--container-width)] lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-20">
        <div className="min-w-0">
          <header className="relative overflow-hidden rounded-[var(--radius-lg)] bg-muted">
            <div className="relative aspect-[16/10] min-h-[260px]">
              <div className="absolute inset-x-0 bottom-0 space-y-3 p-6 sm:p-8">
                <div className="h-8 w-4/5 max-w-xl rounded bg-background/20" />
                <div className="h-4 w-28 rounded bg-background/15" />
              </div>
            </div>
          </header>

          <div className="mt-10 space-y-3">
            {BODY_LINE_WIDTHS.map((width, index) => (
              <div key={index} className={`h-4 rounded bg-muted ${width}`} />
            ))}
          </div>

          <section className="mt-16 border-t pt-12">
            <div className="h-7 w-28 rounded bg-muted" />
            <div className="mt-6 h-48 rounded-[var(--radius-md)] bg-muted" />
          </section>
        </div>

        <aside className="hidden lg:block" aria-hidden>
          <div className="sticky top-24 space-y-3 py-2">
            {TOC_LINE_WIDTHS.map((width, index) => (
              <div
                key={index}
                className={`h-3 rounded bg-muted ${width} ${index > 0 ? "ml-4" : "ml-2"}`}
              />
            ))}
          </div>
        </aside>
      </div>
    </article>
  );
}
