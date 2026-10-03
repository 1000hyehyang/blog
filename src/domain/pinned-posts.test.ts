import { expect, it } from "vitest";
import { rebasePinnedOrder } from "./pinned-posts";

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
