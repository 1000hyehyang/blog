import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ScrollToTop } from "./scroll-to-top";

const route = vi.hoisted(() => ({ pathname: "/first" }));
const OriginalResizeObserver = window.ResizeObserver;
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.ResizeObserver = OriginalResizeObserver;
  history.replaceState(null, "", "/");
});

it.each(["wheel", "pointerdown", "keydown", "hashchange"])(
  "aligns streamed targets and late image layouts until %s",
  async (event) => {
    let resize!: () => void;
    const disconnect = vi.fn();
    window.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        resize = () => callback([], this);
      }
      observe() {}
      unobserve() {}
      disconnect = disconnect;
    };
    history.replaceState(null, "", "/first#late-target");
    const view = render(<ScrollToTop />);
    const target = document.createElement("div");
    target.id = "late-target";
    target.scrollIntoView = vi.fn();
    document.body.append(target);
    try {
      await waitFor(() => expect(target.scrollIntoView).toHaveBeenCalledOnce());
      resize();
      expect(target.scrollIntoView).toHaveBeenCalledTimes(2);
      window.dispatchEvent(new Event(event));
      resize();
      expect(disconnect).toHaveBeenCalled();
      expect(target.scrollIntoView).toHaveBeenCalledTimes(2);
      view.unmount();
    } finally {
      target.remove();
    }
  },
);

it("preserves direct anchors and still resets ordinary route navigation", () => {
  const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  history.replaceState(null, "", "/first#comments-title");
  const view = render(<ScrollToTop />);
  expect(scroll).not.toHaveBeenCalled();
  route.pathname = "/second";
  history.replaceState(null, "", "/second#heading");
  view.rerender(<ScrollToTop />);
  expect(scroll).not.toHaveBeenCalled();
  route.pathname = "/third";
  history.replaceState(null, "", "/third");
  view.rerender(<ScrollToTop />);
  expect(scroll).toHaveBeenCalledWith(0, 0);
});
