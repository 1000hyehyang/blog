const RECENT_CARD_COUNT = 6;
const EXCERPT_LINE_WIDTHS = ["w-full", "w-11/12", "w-10/12"];
const FEATURED_DOT_COUNT = 3;

export default function Loading() {
  return (
    <div className="page-shell animate-pulse" aria-label="콘텐츠 로딩 중">
      <section>
        <div className="h-9 w-72 max-w-full rounded bg-muted sm:h-10" />
        <div className="mt-3 h-4 w-80 max-w-full rounded bg-muted" />
      </section>

      <section className="section-space" aria-hidden>
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-3 w-10 rounded bg-muted" />
        </div>

        <div className="relative">
          <article className="grid items-center gap-8 md:grid-cols-[1.2fr_1fr] md:gap-10">
            <div className="aspect-[16/10] rounded-[var(--radius-lg)] bg-muted" />

            <div className="min-w-0">
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="mt-3 space-y-2">
                <div className="h-7 w-full rounded bg-muted sm:h-8" />
                <div className="h-7 w-4/5 rounded bg-muted sm:h-8" />
              </div>
              <div className="mt-4 space-y-2">
                {EXCERPT_LINE_WIDTHS.map((width, index) => (
                  <div key={index} className={`h-4 rounded bg-muted ${width}`} />
                ))}
              </div>
              <div className="mt-5 h-3 w-24 rounded bg-muted" />
              <div className="mt-7 h-10 w-28 rounded-[var(--radius-sm)] bg-muted" />
            </div>
          </article>
        </div>

        <div className="mt-5 flex justify-center gap-1.5">
          {Array.from({ length: FEATURED_DOT_COUNT }, (_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full bg-muted ${index === 0 ? "w-5" : "w-1.5"}`}
            />
          ))}
        </div>
      </section>

      <section className="section-space" aria-hidden>
        <div className="mb-6 flex items-end justify-between">
          <div className="h-5 w-24 rounded bg-muted" />
          <div className="h-4 w-16 rounded bg-muted" />
        </div>

        <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: RECENT_CARD_COUNT }, (_, index) => (
            <article key={index}>
              <div className="aspect-[16/10] rounded-[var(--radius-md)] bg-muted" />
              <div className="pt-4">
                <div className="space-y-2">
                  <div className="h-5 w-full rounded bg-muted" />
                  <div className="h-5 w-4/5 rounded bg-muted" />
                </div>
                <div className="mt-2 space-y-2">
                  <div className="h-4 w-full rounded bg-muted" />
                  <div className="h-4 w-10/12 rounded bg-muted" />
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-3 w-8 rounded bg-muted" />
                  <div className="h-3 w-8 rounded bg-muted" />
                  <div className="ml-auto h-3 w-16 rounded bg-muted" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
