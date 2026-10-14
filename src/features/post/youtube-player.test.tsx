import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";

import { YouTubePlayer } from "./youtube-player";

const video = { id: "0F1BsTyt_XU" };

it("keeps the server iframe inert during streaming with a no-JavaScript fallback", () => {
  const html = renderToStaticMarkup(
    <YouTubePlayer video={video} title="Original title" />,
  );
  expect(html).toContain("<noscript><iframe");
  expect(html).toContain(
    'src="https://www.youtube-nocookie.com/embed/0F1BsTyt_XU?rel=0"',
  );
  expect(html).toContain('title="Original title"');
  expect(html).toContain('loading="lazy"');
});

it("mounts the same native lazy player after hydration without remounting on title changes", () => {
  const { container, rerender } = render(
    <YouTubePlayer video={video} title="Original title" />,
  );
  const frame = screen.getByTitle("Original title");
  expect(container.querySelector("noscript")).toBeNull();
  expect(frame).toHaveAttribute("loading", "lazy");
  expect(frame).toHaveAttribute("allowfullscreen");
  expect(frame).toHaveAttribute(
    "referrerpolicy",
    "strict-origin-when-cross-origin",
  );
  rerender(<YouTubePlayer video={video} title="Updated title" />);
  expect(screen.getByTitle("Updated title")).toBe(frame);
});

it("does not render invalid video IDs", () => {
  const { container } = render(<YouTubePlayer video={{ id: "invalid" }} />);
  expect(container).toBeEmptyDOMElement();
});
