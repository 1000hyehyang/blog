import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("post loading boundaries", () => {
  it("keeps the home fallback from wrapping post details", () => {
    expect(existsSync("src/app/(site)/loading.tsx")).toBe(false);
    expect(existsSync("src/app/(site)/(home)/page.tsx")).toBe(true);
    expect(existsSync("src/app/(site)/(home)/loading.tsx")).toBe(true);
  });

  it("keeps the list fallback from wrapping post details", () => {
    expect(existsSync("src/app/(site)/posts/loading.tsx")).toBe(false);
    expect(existsSync("src/app/(site)/posts/(index)/loading.tsx")).toBe(true);
    expect(existsSync("src/app/(site)/[postId]/loading.tsx")).toBe(true);
  });
});
