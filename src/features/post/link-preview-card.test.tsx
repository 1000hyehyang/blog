import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { getLinkPreviewImagePath } from "@/lib/link-preview";
import { LinkPreviewCard } from "./link-preview-card";

afterEach(() => cleanup());

it("preserves failures for the same sources and retries images and favicons when sources change", () => {
  const preview = {
    url: "https://example.com/first",
    hostname: "example.com",
    image: "https://example.com/first.png",
    icon: "https://example.com/first.ico",
  };
  const { container, rerender } = render(<LinkPreviewCard preview={preview} />);
  fireEvent.error(container.querySelector(".link-preview-card__image img")!);
  fireEvent.error(container.querySelector("img.link-preview-card__favicon")!);

  rerender(
    <LinkPreviewCard preview={{ ...preview, title: "Updated title" }} />,
  );
  expect(container.querySelector(".link-preview-card__image")).toBeNull();
  expect(
    container.querySelector("svg.link-preview-card__favicon"),
  ).toBeInTheDocument();

  const replacement = {
    ...preview,
    url: "https://example.com/second",
    icon: "https://example.com/second.ico",
  };
  rerender(<LinkPreviewCard preview={replacement} />);
  expect(
    container.querySelector(".link-preview-card__image img"),
  ).toHaveAttribute("src", getLinkPreviewImagePath(replacement.url));
  expect(
    container.querySelector("img.link-preview-card__favicon"),
  ).toHaveAttribute("src", replacement.icon);

  rerender(<LinkPreviewCard preview={preview} />);
  expect(
    container.querySelector(".link-preview-card__image img"),
  ).toHaveAttribute("src", getLinkPreviewImagePath(preview.url));
  expect(
    container.querySelector("img.link-preview-card__favicon"),
  ).toHaveAttribute("src", preview.icon);
});
