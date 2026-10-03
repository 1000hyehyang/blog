import { useState } from "react";
import {
  rebasePinnedOrder,
  samePinnedOrder,
  type PinnedPost,
} from "@/domain/pinned-posts";
import type { LocalDraft } from "./local-drafts";

export function usePinnedOrder(
  latest: PinnedPost[],
  current: string,
  featured: boolean,
  draft?: LocalDraft,
) {
  const [posts, setPosts] = useState(draft?.pinned ?? latest);
  const [order, setOrder] = useState(() => {
    if (draft) return draft.order;
    const slugs = latest.map((post) => post.slug);
    return featured && !slugs.includes(current) ? [...slugs, current] : slugs;
  });
  const [conflict, setConflict] = useState<PinnedPost[] | null>(() =>
    draft &&
    !samePinnedOrder(
      draft.pinned.map((post) => post.slug),
      latest.map((post) => post.slug),
    )
      ? latest
      : null,
  );
  const base = posts.map((post) => post.slug);

  function resolve(choice: "latest" | "draft", currentFeatured: boolean) {
    if (!conflict) return;
    const latestSlugs = conflict.map((post) => post.slug);
    const allowed = [
      ...latestSlugs.filter((slug) => slug !== current),
      ...(currentFeatured ? [current] : []),
    ];
    const next =
      choice === "draft"
        ? rebasePinnedOrder(base, order, allowed)
        : latestSlugs.filter((slug) => slug !== current || currentFeatured);
    if (currentFeatured && !next.includes(current)) next.push(current);
    setOrder(next);
    setPosts(conflict);
    setConflict(null);
  }

  return { posts, base, order, setOrder, conflict, setConflict, resolve };
}
