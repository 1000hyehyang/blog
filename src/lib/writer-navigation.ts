import { slugSchema } from "./content/post-file";
import { z } from "zod";

export function writerDestination(next?: unknown): string {
  if (typeof next !== "string") return "/manage";
  if (next === "/write" || next === "/manage" || next === "/manage?tab=drafts")
    return next;
  if (next.startsWith("/write?")) {
    const query = new URLSearchParams(next.slice(7));
    const key = query.has("draft")
      ? "draft"
      : query.has("new")
        ? "new"
        : "slug";
    const slug = query.get(key);
    const valid =
      key === "new"
        ? slug === "legacy" || z.uuid().safeParse(slug).success
        : slugSchema.safeParse(slug).success;
    if (valid && [...query.keys()].length === 1)
      return `/write?${key}=${encodeURIComponent(slug!)}`;
  }
  return "/manage";
}
