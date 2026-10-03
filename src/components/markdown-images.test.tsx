import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MarkdownContent } from "./markdown";

vi.mock("server-only", () => ({}));
afterEach(cleanup);

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
