import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig from "../../next.config";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("site URL", () => {
  it("only adds a site-wide noindex header to preview deployments", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(await nextConfig.headers!()).toEqual([
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ]);
    vi.stubEnv("VERCEL_ENV", "production");
    expect(await nextConfig.headers!()).toEqual([]);
  });
  it("removes trailing slashes from the configured URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://blog.example.com///");

    const { siteConfig } = await import("./site");

    expect(siteConfig.url).toBe("https://blog.example.com");
  });

  it("uses the public domain when the configured URL is empty", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    const { siteConfig } = await import("./site");

    expect(siteConfig.url).toBe("https://blog.1000hyehyang.me");
  });
});
