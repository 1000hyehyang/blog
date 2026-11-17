import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  previewImageSource,
  verifyPreviewImage,
} from "./link-preview-signature";
import { GET } from "@/app/api/link-preview-image/route";
import { fetchLinkPreviewImage } from "@/infrastructure/link-preview/link-preview";

vi.mock("server-only", () => ({}));
vi.mock("@/infrastructure/link-preview/link-preview", () => ({
  fetchLinkPreviewImage: vi.fn(),
}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

it("fetches only a signed image and rejects tampering, extra cache keys and rotated secrets before fetching", async () => {
  vi.stubEnv("WRITE_SESSION_SECRET", "a".repeat(32));
  const source = previewImageSource("https://example.com/photo.png")!;
  const url = new URL(source, "https://blog.example");
  const signature = url.searchParams.get("signature")!;
  expect(verifyPreviewImage("https://example.com/photo.png", signature)).toBe(
    true,
  );
  const invalid = [
    "/api/link-preview-image?url=https://example.com/photo.png",
    source.replace("photo.png", "other.png"),
    source + "&cachebuster=1",
    source + "&url=https://example.com/photo.png",
    source.replace(signature, "x".repeat(43)),
  ];
  for (const path of invalid)
    expect((await GET(new NextRequest(new URL(path, url)))).status).toBe(403);
  expect(fetchLinkPreviewImage).not.toHaveBeenCalled();
  vi.mocked(fetchLinkPreviewImage).mockResolvedValue({
    body: new ArrayBuffer(1),
    contentType: "image/png",
  });
  const response = await GET(new NextRequest(url));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("s-maxage=86400");
  expect(fetchLinkPreviewImage).toHaveBeenCalledWith(
    "https://example.com/photo.png",
  );
  vi.stubEnv("WRITE_SESSION_SECRET", "b".repeat(32));
  expect(verifyPreviewImage("https://example.com/photo.png", signature)).toBe(
    false,
  );
  vi.stubEnv("WRITE_SESSION_SECRET", "");
  expect(verifyPreviewImage("https://example.com/photo.png", signature)).toBe(
    false,
  );
  expect(previewImageSource("https://example.com/photo.png")).toBe(
    "https://example.com/photo.png",
  );
  expect(previewImageSource("http://127.0.0.1/private.png")).toBeUndefined();
});
