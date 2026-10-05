import { expect, it } from "vitest";
import { canOptimizeImage } from "./images";

it("optimizes uploaded photos without accepting unrelated hosts or paths", () => {
  expect(
    canOptimizeImage(
      "https://store.public.blob.vercel-storage.com/posts/photo.png",
    ),
  ).toBe(true);
  expect(canOptimizeImage("https://images.unsplash.com/photo.jpg")).toBe(true);
  for (const url of [
    "https://store.public.blob.vercel-storage.com/other/photo.png",
    "https://store.public.blob.vercel-storage.com.evil.test/posts/photo.png",
    "https://nested.store.public.blob.vercel-storage.com/posts/photo.png",
    "https://store.public.blob.vercel-storage.com:8443/posts/photo.png",
    "//evil.test/photo.png",
  ])
    expect(canOptimizeImage(url)).toBe(false);
});
