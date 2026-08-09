import Link from "next/link";

import { routes } from "@/lib/routes";

type PostTagsProps = {
  tags: string[];
};

export function PostTags({ tags }: PostTagsProps) {
  if (!tags.length) return null;

  return (
    <footer className="mt-8 text-sm text-secondary" aria-label="포스트 태그">
      <p className="section-label">Tag</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <li key={tag}>
            <Link
              href={{ pathname: routes.search, query: { q: tag } }}
              className="inline-flex rounded-full bg-muted px-3 py-1.5 text-xs transition-colors hover:bg-foreground hover:text-background"
            >
              #{tag}
            </Link>
          </li>
        ))}
      </ul>
    </footer>
  );
}
