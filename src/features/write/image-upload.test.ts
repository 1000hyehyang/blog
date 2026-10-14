import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { uploadPostImage } from "./image-upload";

const upload = vi.hoisted(() => vi.fn());
vi.mock("@vercel/blob/client", () => ({ uploadPresigned: upload }));

let width = 2400;
let height = 1600;
const draw = vi.fn();
const revoke = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  width = 2400;
  height = 1600;
  upload.mockResolvedValue({ url: "https://images.example/photo.webp" });
  vi.stubGlobal(
    "Image",
    class {
      src = "";
      naturalWidth = width;
      naturalHeight = height;
      decode = async () => {};
    },
  );
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = () => "blob:photo";
      static revokeObjectURL = revoke;
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: draw,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((done) =>
    done(new Blob(["smaller"], { type: "image/webp" })),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function photo(type = "image/jpeg") {
  return new File(["original".repeat(100)], "my-photo.jpg", { type });
}

it("uploads a smaller WebP while keeping ordinary photo resolution and alt text", async () => {
  const result = await uploadPostImage(photo(), "art", "post-id");
  expect(upload).toHaveBeenCalledWith(
    expect.stringMatching(/^posts\/art\/post-id\/.+\.webp$/),
    expect.objectContaining({ type: "image/webp", size: 7 }),
    expect.objectContaining({ contentType: "image/webp" }),
  );
  expect(draw).toHaveBeenCalledWith(expect.anything(), 0, 0, 2400, 1600);
  expect(result).toEqual({
    src: "https://images.example/photo.webp",
    alt: "my-photo",
    dimensions: { width: 2400, height: 1600 },
  });
  expect(revoke).toHaveBeenCalledWith("blob:photo");
});

it("only resizes oversized photos and records the actual uploaded dimensions", async () => {
  width = 8000;
  height = 6000;
  const result = await uploadPostImage(photo(), "art", "post-id");
  expect(draw).toHaveBeenCalledWith(expect.anything(), 0, 0, 5120, 3840);
  expect(result.dimensions).toEqual({ width: 5120, height: 3840 });
});

it.each(["image/png", "image/gif", "image/webp", "image/avif"])(
  "preserves the original %s bytes and resolution",
  async (type) => {
    width = 8000;
    const file = photo(type);
    const result = await uploadPostImage(file, "art", "post-id");
    expect(upload.mock.calls[0][1]).toBe(file);
    expect(upload.mock.calls[0][2].contentType).toBe(type);
    expect(result.dimensions).toEqual({ width: 8000, height: 1600 });
    expect(draw).not.toHaveBeenCalled();
  },
);

it.each([
  null,
  new Blob(["x".repeat(1000)], { type: "image/webp" }),
  new Blob([], { type: "image/webp" }),
  new Blob(["unsupported format"], { type: "image/png" }),
])(
  "keeps the original when encoding offers no usable size saving (%s)",
  async (encoded) => {
    width = 8000;
    const file = photo();
    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation((done) =>
      done(encoded),
    );
    const result = await uploadPostImage(file, "art", "post-id");
    expect(upload.mock.calls[0][0]).toMatch(/\.jpg$/);
    expect(upload.mock.calls[0][1]).toBe(file);
    expect(result.dimensions).toEqual({ width: 8000, height: 1600 });
  },
);

it("falls back to the original when the browser encoder fails", async () => {
  const file = photo();
  vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation(() => {
    throw new Error("Encoder unavailable");
  });
  await uploadPostImage(file, "art", "post-id");
  expect(upload.mock.calls[0][1]).toBe(file);
  expect(revoke).toHaveBeenCalledWith("blob:photo");
});

it("rejects undecodable images before uploading and releases the object URL", async () => {
  width = 0;
  await expect(uploadPostImage(photo(), "art", "post-id")).rejects.toThrow(
    "이미지 크기를 확인하지 못했습니다.",
  );
  expect(upload).not.toHaveBeenCalled();
  expect(revoke).toHaveBeenCalledWith("blob:photo");
});
