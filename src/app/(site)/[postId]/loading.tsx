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
              <div className="h-[1lh] w-4/5 rounded bg-background/20 text-2xl leading-snug sm:text-3xl lg:text-4xl" />
              <div className="mt-4 flex items-center gap-3" aria-hidden="true">
                <div className="size-7 shrink-0 rounded-full bg-background/20" />
                <div className="h-3 w-9 rounded bg-background/15" />
                <div className="h-3 w-16 rounded bg-background/15" />
              </div>
            </div>
          </header>

          <div className="mt-10" aria-hidden="true">
            <div className="prose">
              <h2 className="markdown-heading markdown-heading--1">
                <span className="block h-[1lh] w-2/3 rounded bg-muted" />
              </h2>
              <p>
                {BODY_LINE_WIDTHS.map((width, index) => (
                  <span key={index} className="flex h-[1lh] items-center">
                    <span className={`h-4 rounded bg-muted ${width}`} />
                  </span>
                ))}
              </p>
            </div>

            <footer className="mt-8 text-sm text-secondary">
              <div className="section-label">
                <div className="h-[1lh] w-8 rounded bg-muted" />
              </div>
              <div className="mt-3 flex gap-2">
                <div className="h-7 w-16 rounded-full bg-muted" />
                <div className="h-7 w-20 rounded-full bg-muted" />
                <div className="h-7 w-14 rounded-full bg-muted" />
              </div>
            </footer>
          </div>

          <section className="mt-16 border-t pt-12">
            <div className="h-[1lh] w-28 rounded bg-muted text-xl sm:text-2xl" />
            <div className="mt-6 h-48 rounded-[var(--radius-md)] bg-muted" />
          </section>

          <section className="mt-12 border-t pt-8 sm:mt-16 sm:pt-12">
            <div className="h-6 w-24 rounded bg-muted" />
            <div className="mt-6 grid grid-cols-1 gap-6 sm:mt-8 sm:gap-8 md:grid-cols-3 md:gap-10">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index}>
                  <div className="aspect-[16/10] rounded-[var(--radius-md)] bg-muted" />
                  <div className="mt-4 h-6 w-5/6 rounded bg-muted" />
                  <div className="mt-2 text-xs leading-5">
                    {["w-full", "w-11/12", "w-3/4"].map((width) => (
                      <div key={width} className="flex h-[1lh] items-center">
                        <div className={`h-3 rounded bg-muted ${width}`} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div aria-hidden="true">
          <aside
            className="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto"
            aria-hidden="true"
          >
            <div className="py-2">
              <ul className="space-y-1">
                {TOC_LINE_WIDTHS.map((width, index) => (
                  <li
                    key={index}
                    className={`py-1.5 text-xs leading-5 ${index > 0 ? "pl-4" : "pl-2"}`}
                  >
                    <div className={`h-[1lh] rounded bg-muted ${width}`} />
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </article>
  );
}
