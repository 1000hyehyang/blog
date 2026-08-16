import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PostTableOfContents } from "./post-table-of-contents";

describe("PostTableOfContents", () => {
  afterEach(() => {
    cleanup();
    document.querySelectorAll("h2[data-toc-test]").forEach((element) => {
      element.remove();
    });
    vi.restoreAllMocks();
  });

  it("activates a heading that stops on a fractional pixel at the header offset", () => {
    const firstHeading = document.createElement("h2");
    firstHeading.id = "first";
    firstHeading.dataset.tocTest = "true";
    vi.spyOn(firstHeading, "getBoundingClientRect").mockReturnValue({
      top: -100,
    } as DOMRect);

    const secondHeading = document.createElement("h2");
    secondHeading.id = "second";
    secondHeading.dataset.tocTest = "true";
    vi.spyOn(secondHeading, "getBoundingClientRect").mockReturnValue({
      top: 96.5,
    } as DOMRect);

    document.body.append(firstHeading, secondHeading);

    render(
      <PostTableOfContents
        headings={[
          { id: "first", text: "First", level: 2 },
          { id: "second", text: "Second", level: 2 },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Second" })).toHaveAttribute(
      "aria-current",
      "location",
    );
  });
});
