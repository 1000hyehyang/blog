const BODY_LINE_WIDTHS = [
  "w-full",
  "w-11/12",
  "w-10/12",
  "w-full",
  "w-9/12",
  "w-full",
  "w-8/12",
];
const TOC_LINE_WIDTHS = ["w-24", "w-32", "w-28", "w-36", "w-20"];

export default function PostDetailLoading() {
  return (
    <article
      className="page-shell page-shell--detail animate-pulse"
      aria-busy="true"
      aria-label="포스트 로딩 중"
    >
      <div className="mx-auto grid max-w-[var(--container-width)] lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-20">
        <div className="min-w-0">
          <header className="grid min-h-[260px] grid-cols-1 overflow-hidden rounded-[var(--radius-lg)] bg-muted">
            <div className="col-start-1 row-start-1 aspect-[16/10]" />
            <div className="relative col-start-1 row-start-1 flex min-w-0 flex-col justify-end p-6 pt-24 sm:p-8 sm:pt-28">
              <div className="h-8 w-4/5 max-w-xl rounded bg-background/20 sm:h-9" />
              <div className="mt-4 h-3 w-28 rounded bg-background/15" />
            </div>
          </header>

          <div className="mt-10 space-y-3">
            {BODY_LINE_WIDTHS.map((width, index) => (
              <div key={index} className={`h-4 rounded bg-muted ${width}`} />
            ))}
          </div>

          <footer className="mt-8" aria-hidden="true">
            <div className="h-3 w-8 rounded bg-muted" />
            <div className="mt-3 flex gap-2">
              <div className="h-7 w-16 rounded-full bg-muted" />
              <div className="h-7 w-20 rounded-full bg-muted" />
              <div className="h-7 w-14 rounded-full bg-muted" />
            </div>
          </footer>

          <section className="mt-16 border-t pt-12">
            <div className="h-7 w-28 rounded bg-muted" />
            <div className="mt-6 h-48 rounded-[var(--radius-md)] bg-muted" />
          </section>

          <section className="mt-12 border-t pt-8 sm:mt-16 sm:pt-12">
            <div className="h-6 w-24 rounded bg-muted" />
            <div className="mt-6 grid grid-cols-1 gap-6 sm:mt-8 sm:gap-8 md:grid-cols-3 md:gap-10">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index}>
                  <div className="aspect-[16/10] rounded-[var(--radius-md)] bg-muted" />
                  <div className="mt-4 h-5 w-5/6 rounded bg-muted" />
                  <div className="mt-2 space-y-2">
                    <div className="h-3 w-full rounded bg-muted" />
                    <div className="h-3 w-11/12 rounded bg-muted" />
                    <div className="h-3 w-3/4 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside
          className="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto"
          aria-hidden="true"
        >
          <div className="space-y-3 py-2">
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
