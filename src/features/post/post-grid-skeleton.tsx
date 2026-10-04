import { resolveArtworkAspectRatio } from "./artwork-layout";

const DEFAULT_CARD_COUNT = 6;

export function PostGridSkeleton({
  count = DEFAULT_CARD_COUNT,
  gallery = false,
}: {
  count?: number;
  gallery?: boolean;
}) {
  if (gallery)
    return (
      <div
        className="columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-4"
        aria-hidden="true"
      >
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className="mb-3 break-inside-avoid rounded-[var(--radius-md)] bg-muted sm:mb-4"
            style={{ aspectRatio: resolveArtworkAspectRatio() }}
          />
        ))}
      </div>
    );
  return (
    <div
      className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3"
      aria-hidden="true"
      data-post-grid-skeleton
    >
      {Array.from({ length: count }, (_, index) => (
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
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="h-3 w-8 rounded bg-muted" />
              <div className="h-3 w-8 rounded bg-muted" />
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <div className="size-5 rounded-full bg-muted" />
                <div className="h-3 w-9 rounded bg-muted" />
                <div className="h-3 w-16 rounded bg-muted" />
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
