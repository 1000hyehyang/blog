import { expect, it } from "vitest";
import { pinnedOrderRanks, rebasePinnedOrder } from "./pinned-posts";

it("merges explicit local ordering/removals with remote additions and removals", () => {
  expect(
    rebasePinnedOrder(
      ["a", "b", "c"],
      ["c", "a", "current"],
      ["a", "b", "d", "current"],
    ),
  ).toEqual(["a", "current", "d"]);
  expect(rebasePinnedOrder(["a", "b"], ["b", "a"], [])).toEqual([]);
  expect(rebasePinnedOrder([], ["current"], ["a", "current"])).toEqual([
    "current",
    "a",
  ]);
});

it("keeps pinned membership valid while allowing explicit removal of other posts", () => {
  const post = { slug: "current", featured: true, published: true };
  expect(pinnedOrderRanks(post, ["a", "b"], ["b", "current"])).toEqual(
    new Map([
      ["b", 0],
      ["current", 1],
    ]),
  );
  expect(pinnedOrderRanks(post, ["a"], ["a", "a", "current"])).toBeNull();
  expect(pinnedOrderRanks(post, ["a"], ["missing", "current"])).toBeNull();
  expect(pinnedOrderRanks(post, ["a"], ["a"])).toBeNull();
  expect(
    pinnedOrderRanks({ ...post, published: false }, ["current", "a"], ["a"]),
  ).toEqual(new Map([["a", 0]]));
  expect(
    pinnedOrderRanks({ ...post, featured: false }, ["current"], ["current"]),
  ).toBeNull();
});
