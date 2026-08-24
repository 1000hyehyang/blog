import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("site URL", () => {
  it("removes trailing slashes from the configured URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://blog.example.com///");

    const { siteConfig } = await import("./site");

    expect(siteConfig.url).toBe("https://blog.example.com");
  });

  it("uses localhost when the configured URL is empty", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    const { siteConfig } = await import("./site");

    expect(siteConfig.url).toBe("http://localhost:3000");
  });
});
