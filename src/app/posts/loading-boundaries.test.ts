import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("post loading boundaries", () => {
  it("keeps the list fallback from wrapping post details", () => {
    expect(existsSync("src/app/posts/loading.tsx")).toBe(false);
    expect(existsSync("src/app/posts/(index)/loading.tsx")).toBe(true);
    expect(existsSync("src/app/[postId]/loading.tsx")).toBe(true);
  });
});
