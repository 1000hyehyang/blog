import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { PostSummary } from "@/domain/post";
import { PostListing } from "./post-listing";

afterEach(cleanup);
const post: PostSummary = {
  id: "art",
  slug: "art",
  title: "Art",
  excerpt: "",
  tags: [],
  category: { name: "Art", slug: "art" },
  coverImage: { src: "https://example.com/cover.jpg" },
  featured: false,
  published: true,
  createdAt: "2026-01-01T00:00:00Z",
  lastEditedAt: null,
  commentsCount: 0,
  reactionsCount: 0,
};

it.each([undefined, { src: "" }, { src: "https://example.com/gallery.jpg" }])(
  "selects the displayed and eager artwork consistently (%j)",
  (galleryImage) => {
    const { container } = render(
      <PostListing posts={[{ ...post, galleryImage }]} category="art" />,
    );
    const image = container.querySelector("img");
    expect(image).toHaveAttribute(
      "src",
      galleryImage?.src || post.coverImage.src,
    );
    expect(image).toHaveAttribute("loading", "eager");
  },
);
