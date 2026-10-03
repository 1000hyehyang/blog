import { Activity, createRef } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ImageLayoutDialog } from "./image-layout-dialog";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("recreates and releases photo previews when a cached page hides and returns", () => {
  let version = 0;
  const createObjectURL = vi.fn(() => `blob:preview-${++version}`);
  const revokeObjectURL = vi.fn();
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    },
  );
  const images = [{ file: new File(["photo"], "photo.png") }];
  const dialogRef = createRef<HTMLDialogElement>();
  const content = (mode: "visible" | "hidden") => (
    <Activity mode={mode}>
      <ImageLayoutDialog
        dialogRef={dialogRef}
        images={images}
        layout="individual"
        error=""
        busy={false}
        onLayoutChange={vi.fn()}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    </Activity>
  );
  const view = render(content("visible"));
  const previews = () =>
    [...view.container.querySelectorAll("img")].map((image) => image.src);
  const original = previews();
  view.rerender(content("hidden"));
  expect(revokeObjectURL.mock.calls.flat()).toEqual(original);
  view.rerender(content("visible"));
  const restored = previews();
  expect(restored).toHaveLength(original.length);
  expect(restored.every((url) => !original.includes(url))).toBe(true);
  view.unmount();
  expect(revokeObjectURL.mock.calls.flat()).toEqual([...original, ...restored]);
});
