import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Post } from "@/domain/post";
import { getPost } from "@/infrastructure/github/github";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  unstable_cache: (loader: unknown) => loader,
}));
vi.mock("@/infrastructure/github/github", () => ({ getPost: vi.fn() }));

describe("self-hosted link preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://blog.example.com");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("uses existing post data instead of fetching the deployed page", async () => {
    vi.mocked(getPost).mockResolvedValue({
      title: "Internal post",
      excerpt: "Internal description",
      coverImage: { src: "https://images.example.com/cover.png" },
      published: true,
    } as Post);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { getLinkPreview } = await import("./link-preview");

    await expect(
      getLinkPreview("https://blog.example.com/posts/20"),
    ).resolves.toMatchObject({
      title: "Internal post",
      description: "Internal description",
      image: "https://images.example.com/cover.png",
      siteName: "1000hyehyang Dev Blog",
    });
    expect(getPost).toHaveBeenCalledWith(20);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
