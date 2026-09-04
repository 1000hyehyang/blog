import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Post } from "@/domain/post";
import { getPost } from "@/infrastructure/github/github";

const remote = vi.hoisted(() => ({
  agents: [] as Array<{
    connect: {
      lookup: (
        hostname: string,
        options: unknown,
        callback: (error: null, address: string, family: number) => void,
      ) => void;
    };
  }>,
  fetch: vi.fn(),
  lookup: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  unstable_cache: (loader: unknown) => loader,
}));
vi.mock("@/infrastructure/github/github", () => ({ getPost: vi.fn() }));
vi.mock("node:dns/promises", () => ({
  default: { lookup: remote.lookup },
  lookup: remote.lookup,
}));
vi.mock("undici", () => ({
  Agent: class {
    constructor(options: (typeof remote.agents)[number]) {
      remote.agents.push(options);
    }

    close() {
      return Promise.resolve();
    }
  },
  fetch: remote.fetch,
}));

describe("self-hosted link preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    remote.agents.length = 0;
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

  it("connects to the public address that was checked", async () => {
    remote.lookup.mockResolvedValue([{ address: "8.8.8.8", family: 4 }]);
    remote.fetch.mockResolvedValue(
      new Response("<title>External post</title>", {
        headers: { "content-type": "text/html" },
      }),
    );
    const { getLinkPreview } = await import("./link-preview");

    await expect(
      getLinkPreview("https://external.example/post"),
    ).resolves.toMatchObject({ title: "External post" });

    const callback = vi.fn();
    remote.agents[0].connect.lookup("external.example", {}, callback);
    expect(callback).toHaveBeenCalledWith(null, "8.8.8.8", 4);
  });
});
