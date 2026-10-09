import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MarkdownContent } from "./markdown";
import { readImageMetadata, writeImageMetadata } from "@/lib/image-metadata";

vi.mock("server-only", () => ({}));
afterEach(cleanup);

it("reserves known image dimensions and accepts ordinary Markdown images", () => {
  const settings = {
    ...readImageMetadata(null),
    dimensions: { width: 800, height: 600 },
  };
  render(
    <MarkdownContent
      source={`![photo](/photo.png "${writeImageMetadata(settings)}")\n\n![ordinary](/ordinary.png)`}
    />,
  );
  const image = document.querySelector('img[src="/photo.png"]');
  expect(image).toHaveAttribute("width", "800");
  expect(image).toHaveAttribute("height", "600");
  expect(
    document.querySelector('img[src="/ordinary.png"]'),
  ).not.toHaveAttribute("width");
});

it("keeps linked images as links while making ordinary images keyboard accessible", () => {
  render(
    <MarkdownContent
      source={
        "[![링크 사진](/linked.png)](#linked)\n\n![일반 사진](/photo.png)"
      }
    />,
  );
  const linked = screen.getByRole("img", { name: "링크 사진" });
  expect(linked.closest("a")).toHaveAttribute("href", "#linked");
  expect(linked).not.toHaveAttribute("tabindex");
  fireEvent.click(linked);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  const ordinary = screen.getByRole("button", { name: "일반 사진 확대 보기" });
  expect(ordinary).toHaveAttribute("tabindex", "0");
  expect(ordinary).toHaveAttribute("aria-haspopup", "dialog");
});
