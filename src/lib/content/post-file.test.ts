import { describe, expect, it } from "vitest";
import {
  parsePostFile,
  nextPostSlug,
  serializePostFile,
  slugSchema,
  type FilePost,
} from "./post-file";

export const samplePost: FilePost = {
  id: "post-a",
  slug: "post-a",
  title: "제목",
  body: "# 본문\n\n![image](https://example.com/a.png)\n\n---\n\n```ts\nconst a = 1;\n```\n",
  category: { name: "Development", slug: "development" },
  tags: ["한글"],
  excerpt: "",
  coverImage: { src: "" },
  featured: false,
  published: true,
  createdAt: "2026-01-01T00:00:00Z",
  lastEditedAt: null,
  commentsCount: 0,
  reactionsCount: 0,
};
describe("Markdown post files", () => {
  it("preserves the exact Markdown and identity", () => {
    expect(
      parsePostFile(serializePostFile(samplePost), samplePost.slug),
    ).toMatchObject({
      body: samplePost.body,
      id: samplePost.id,
      slug: samplePost.slug,
    });
  });
  it("allocates the next sequential post slug", () => {
    expect(nextPostSlug(["post-1", "post-8", "custom-slug"])).toBe("post-9");
  });
  it("rejects traversal, reserved numeric paths and mismatched filenames", () => {
    for (const slug of ["../x", "%2f", "12", "A", "a/b"])
      expect(slugSchema.safeParse(slug).success).toBe(false);
    expect(() =>
      parsePostFile(serializePostFile(samplePost), "different"),
    ).toThrow();
    expect(() =>
      parsePostFile("---\npublished: true\n---\nbody", "a"),
    ).toThrow();
  });
});
