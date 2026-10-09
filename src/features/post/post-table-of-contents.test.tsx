import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PostTableOfContents } from "./post-table-of-contents";

describe("PostTableOfContents", () => {
  let top: number;
  let scrollY: number;
  let time: number;
  let frames: Map<number, FrameRequestCallback>;
  let resize: ResizeObserverCallback;

  beforeEach(() => {
    top = 2096;
    scrollY = 0;
    time = 0;
    frames = new Map();
    let frameId = 0;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.set(++frameId, callback);
      return frameId;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      frames.delete(id);
    });
    vi.spyOn(window, "scrollY", "get").mockImplementation(() => scrollY);
    vi.spyOn(window, "scrollTo").mockImplementation((options) => {
      scrollY = Math.round((options as ScrollToOptions).top!);
    });
    vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(
      10_000,
    );
    vi.spyOn(window, "ResizeObserver").mockImplementation(
      class {
        constructor(callback: ResizeObserverCallback) {
          resize = callback;
        }
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
    );
    const heading = document.createElement("h2");
    heading.id = "target";
    heading.dataset.tocTest = "true";
    vi.spyOn(heading, "getBoundingClientRect").mockImplementation(
      () => ({ top: top - scrollY }) as DOMRect,
    );
    document.body.append(heading);
  });

  afterEach(() => {
    cleanup();
    document
      .querySelectorAll("h2[data-toc-test]")
      .forEach((element) => element.remove());
    vi.restoreAllMocks();
  });

  function mount(reduced = false) {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      ...window.matchMedia("(prefers-reduced-motion: reduce)"),
      matches: reduced,
    });
    return render(
      <PostTableOfContents
        headings={[{ id: "target", text: "Target", level: 2 }]}
      />,
    );
  }

  function advance(count = 1) {
    act(() => {
      for (let frame = 0; frame < count; frame++) {
        time += 16;
        const pending = [...frames.values()];
        frames.clear();
        pending.forEach((callback) => callback(time));
      }
    });
  }

  it("starts gently and keeps moving before decelerating into the heading", () => {
    mount();
    fireEvent.click(screen.getByRole("link", { name: "Target" }));
    advance(8);
    expect(scrollY).toBeGreaterThan(0);
    expect(scrollY).toBeLessThan(400);
    advance(24);
    expect(scrollY).toBeGreaterThan(1000);
    expect(scrollY).toBeLessThan(1900);
    advance(150);
    expect(scrollY).toBe(2000);
    expect(frames.size).toBe(0);
  });

  it("follows a moving heading without waiting for scrollend or body resize", () => {
    mount();
    fireEvent.click(screen.getByRole("link", { name: "Target" }));
    advance(8);
    expect(scrollY).toBeGreaterThan(0);
    expect(scrollY).toBeLessThan(2000);
    top += 600;
    const previousY = scrollY;
    advance();
    expect(scrollY).toBeGreaterThan(previousY);
    expect(scrollY).toBeLessThan(2600);
    // Transforms move headings without triggering ResizeObserver.
    for (let frame = 0; frame < 30; frame++) {
      top += 1;
      advance();
    }
    advance(150);
    expect(scrollY).toBe(2630);
    expect(frames.size).toBe(0);
    const calls = vi.mocked(window.scrollTo).mock.calls.length;
    fireEvent(document, new Event("scrollend"));
    act(() => resize([], {} as ResizeObserver));
    advance(10);
    expect(window.scrollTo).toHaveBeenCalledTimes(calls);
  });

  it("keeps following a transform even when its remaining movement is below one pixel", () => {
    mount();
    fireEvent.click(screen.getByRole("link", { name: "Target" }));
    top = 96.5;
    for (let frame = 0; frame < 30; frame++) {
      top += 0.01;
      advance();
      expect(frames.size).toBe(1);
    }
    advance(150);
    expect(scrollY).toBe(1);
    expect(frames.size).toBe(0);
  });

  it("uses instant scrolling and maintains alignment with reduced motion", () => {
    mount(true);
    fireEvent.click(screen.getByRole("link", { name: "Target" }));
    expect(window.scrollTo).toHaveBeenLastCalledWith({
      top: 2000,
      behavior: "instant",
    });
    expect(frames.size).toBe(0);
    top += 400;
    act(() => resize([], {} as ResizeObserver));
    expect(scrollY).toBe(2400);
  });

  it.each(["wheel", "pointerdown", "keydown", "unmount"])(
    "cancels pending scrolling on %s",
    (event) => {
      const { unmount } = mount();
      fireEvent.click(screen.getByRole("link", { name: "Target" }));
      advance(4);
      if (event === "unmount") unmount();
      else fireEvent(window, new Event(event));
      const previousY = scrollY;
      top += 400;
      act(() => resize([], {} as ResizeObserver));
      advance(150);
      expect(scrollY).toBe(previousY);
      expect(frames.size).toBe(0);
    },
  );

  it("replaces the pending animation when another heading is clicked", () => {
    const { rerender } = mount();
    const second = document.createElement("h2");
    second.id = "second";
    second.dataset.tocTest = "true";
    vi.spyOn(second, "getBoundingClientRect").mockImplementation(
      () => ({ top: 296 - scrollY }) as DOMRect,
    );
    document.body.append(second);
    rerender(
      <PostTableOfContents
        headings={[
          { id: "target", text: "Target", level: 2 },
          { id: "second", text: "Second", level: 2 },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("link", { name: "Target" }));
    advance(8);
    expect(scrollY).toBeGreaterThan(200);
    fireEvent.click(screen.getByRole("link", { name: "Second" }));
    expect(frames.size).toBe(1);
    advance(150);
    expect(scrollY).toBe(200);
    expect(frames.size).toBe(0);
  });

  it.each([0, 20_000])(
    "finishes at the document boundary for a heading at %s",
    (headingTop) => {
      top = headingTop;
      mount();
      fireEvent.click(screen.getByRole("link", { name: "Target" }));
      advance(150);
      expect(scrollY).toBe(headingTop === 0 ? 0 : 10_000 - window.innerHeight);
      expect(frames.size).toBe(0);
    },
  );

  it("activates a heading that stops on a fractional pixel at the header offset", () => {
    const first = document.createElement("h2");
    first.id = "first";
    first.dataset.tocTest = "true";
    vi.spyOn(first, "getBoundingClientRect").mockReturnValue({
      top: -100,
    } as DOMRect);
    document.body.append(first);
    top = 96.5;
    render(
      <PostTableOfContents
        headings={[
          { id: "first", text: "First", level: 2 },
          { id: "target", text: "Target", level: 2 },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Target" })).toHaveAttribute(
      "aria-current",
      "location",
    );
  });
});
