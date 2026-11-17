import { expect, it } from "vitest";
import { backupSources, imageReferences } from "./images-report.mjs";

it("retains body, metadata, encoded group and damaged draft references without deleting blobs", () => {
  const files = [
    "body.png",
    "cover.png",
    "group.png",
    "draft.png",
    "unused.png",
  ];
  const blobs = files.map((name) => ({
    pathname: `posts/art/id/${name}`,
    url: `https://blob.example/${name}`,
  }));
  const raw = JSON.stringify({
    version: 1,
    origin: "https://blog.example",
    exportedAt: "2026-01-01T00:00:00Z",
    drafts: [
      { key: "broken", raw: '{"image":"https://blob.example/draft.png' },
    ],
    recovery: [],
  });
  const result = imageReferences(blobs, [
    "![body](https://blob.example/body.png)",
    '{"coverImage":{"src":"https://blob.example/cover.png"}}',
    encodeURIComponent(
      JSON.stringify({ images: ["https://blob.example/group.png"] }),
    ),
    ...backupSources(raw),
  ]);
  expect(
    result
      .filter(({ referenced }) => !referenced)
      .map(({ pathname }) => pathname),
  ).toEqual(["posts/art/id/unused.png"]);
  expect(blobs).toHaveLength(5);
});

it.each(["{", "{}", JSON.stringify({ version: 2, drafts: [], recovery: [] })])(
  "rejects an unreadable backup instead of ignoring its references: %s",
  (raw) => {
    expect(() => backupSources(raw)).toThrow();
  },
);
