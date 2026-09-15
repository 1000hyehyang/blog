import { slugSchema } from "./content/post-file";

// Only known local destinations may be used after password login.
export function writerDestination(next?: unknown): string {
  if (typeof next !== "string") return "/manage";
  if (next === "/write" || next === "/manage" || next === "/manage?tab=drafts")
    return next;
  if (next.startsWith("/write?")) {
    const query = new URLSearchParams(next.slice(7));
    const key = query.has("draft") ? "draft" : "slug";
    const slug = query.get(key);
    if (slugSchema.safeParse(slug).success && [...query.keys()].length === 1)
      return `/write?${key}=${encodeURIComponent(slug!)}`;
  }
  return "/manage";
}
