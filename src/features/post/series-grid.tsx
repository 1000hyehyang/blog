import { Layers3 } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/content";
import { routes } from "@/lib/routes";
import { EmptyState } from "./empty-state";
import { PostCoverImage } from "./post-cover-image";
import type { SeriesSummary } from "./post-queries";

export function SeriesGrid({
  category,
  series,
}: {
  category: string;
  series: SeriesSummary[];
}) {
  if (!series.length)
    return (
      <EmptyState
        title="아직 시리즈가 없어요"
        description="시리즈로 모은 글을 이곳에서 볼 수 있어요."
      />
    );
  return (
    <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {series.map((item) => (
        <article key={item.slug} data-series-card>
          <Link
            href={routes.series(category, item.slug)}
            className="group block rounded-[var(--radius-md)] focus-visible:outline-offset-4"
          >
            <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-[var(--radius-md)] bg-muted">
              {item.coverImage.src ? (
                <PostCoverImage
                  image={item.coverImage}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition duration-300 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="grid h-full place-items-center">
                  <Layers3
                    size={36}
                    strokeWidth={1.2}
                    className="text-[var(--code-inline-foreground)]"
                    aria-hidden
                  />
                </div>
              )}
            </div>
            <h2 className="text-lg font-semibold leading-7 tracking-tight group-hover:underline group-hover:underline-offset-4">
              {item.label}
            </h2>
            {item.description && (
              <p className="mt-2 line-clamp-2 text-sm text-secondary">
                {item.description}
              </p>
            )}
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-secondary">
              <span>{item.postCount}개의 포스트</span>
              {item.updatedAt && (
                <span>
                  <time dateTime={item.updatedAt}>
                    {formatDate(item.updatedAt)}
                  </time>{" "}
                  업데이트
                </span>
              )}
            </p>
          </Link>
        </article>
      ))}
    </div>
  );
}
