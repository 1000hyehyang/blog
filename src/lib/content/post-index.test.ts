import { expect, it } from "vitest";
import {
  buildChunks,
  decodeChunk,
  searchSchema,
  matchingSearchSlugs,
} from "./post-index";

it("matches unique queries crossing chunk boundaries and preserves surrogate pairs", () => {
  const text =
    "x".repeat(99_990) + "boundary-token-unique 😀" + "y".repeat(800_000);
  const chunks = buildChunks("search", [{ slug: "large", text }]);
  expect(chunks.files.length).toBeGreaterThan(1);
  const documents = chunks.files
    .reverse()
    .flatMap(({ content }) => searchSchema.parse(decodeChunk(content)));
  expect(matchingSearchSlugs(documents, "boundary-token-unique 😀")).toEqual([
    "large",
  ]);
  expect(matchingSearchSlugs(documents, "unmatched")).toEqual([]);
  expect(matchingSearchSlugs(documents, "y")).toEqual(["large"]);
  expect(documents.every(({ text }) => !/[\uD800-\uDBFF]$/.test(text))).toBe(
    true,
  );
});

it("keeps worst-case JSON escaping within the decompression bound", () => {
  const chunks = buildChunks("search", [
    { slug: "large", text: "\u0000".repeat(300_000) },
  ]);
  for (const { content } of chunks.files)
    expect(() => decodeChunk(content)).not.toThrow();
});
