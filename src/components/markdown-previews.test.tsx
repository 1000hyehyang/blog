import { Suspense } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MarkdownContent } from "./markdown";

const preview = vi.hoisted(() => ({
  ready: false,
  pending: Promise.resolve(),
  image: undefined as string | undefined,
  missing: false,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/features/post/youtube-embed", async () => {
  const { YouTubePlayer } = await import("@/features/post/youtube-player");
  return {
    YouTubeEmbed: () => {
      if (!preview.ready) throw preview.pending;
      return (
        <YouTubePlayer video={{ id: "0F1BsTyt_XU" }} title="Video title" />
      );
    },
  };
});
vi.mock("@/features/post/external-link-preview", async () => {
  const { LinkPreviewCard } = await import("@/features/post/link-preview-card");
  return {
    ExternalLinkPreview: () => {
      if (!preview.ready) throw preview.pending;
      if (preview.missing) return null;
      return (
        <LinkPreviewCard
          preview={{
            url: "https://example.com/post",
            hostname: "example.com",
            title: "Link title",
            image: preview.image,
          }}
        />
      );
    },
  };
});
afterEach(cleanup);

it("shows the article while YouTube metadata loads and keeps the same player geometry", async () => {
  preview.ready = false;
  let resolve!: () => void;
  preview.pending = new Promise<void>((done) => {
    resolve = done;
  });
  const { container } = render(
    <MarkdownContent
      source={"Article before\n\nhttps://youtu.be/0F1BsTyt_XU\n\nArticle after"}
    />,
  );
  expect(screen.getByText("Article before")).toBeVisible();
  expect(screen.getByText("Article after")).toBeVisible();
  expect(container.querySelector(".youtube-player[aria-busy]")).not.toBeNull();
  expect(container.querySelector("iframe")).toBeNull();
  await act(async () => {
    preview.ready = true;
    resolve();
  });
  expect(container.querySelector("[aria-busy]")).toBeNull();
  expect(container.querySelectorAll(".youtube-player")).toHaveLength(1);
  expect(screen.getByText("Article after")).toBeVisible();
  expect(screen.getByTitle("Video title")).toHaveAttribute("loading", "lazy");
});

it.each(["with image", "without image", "unavailable"])(
  "renders an external preview %s without displaying a temporary image card",
  async (kind) => {
    preview.ready = false;
    preview.image =
      kind === "with image" ? "https://example.com/photo.png" : undefined;
    preview.missing = kind === "unavailable";
    let resolve!: () => void;
    preview.pending = new Promise<void>((done) => {
      resolve = done;
    });
    const { container } = render(
      <Suspense fallback={<p>Loading article</p>}>
        <MarkdownContent
          source={"Article before\n\nhttps://example.com/post\n\nArticle after"}
        />
      </Suspense>,
    );
    expect(screen.getByText("Loading article")).toBeVisible();
    expect(container.querySelector(".link-preview-card")).toBeNull();
    await act(async () => {
      preview.ready = true;
      resolve();
    });
    expect(screen.getByText("Article before")).toBeVisible();
    expect(screen.getByText("Article after")).toBeVisible();
    expect(container.querySelector("[aria-busy]")).toBeNull();
    expect(container.querySelectorAll(".link-preview-card")).toHaveLength(
      preview.missing ? 0 : 1,
    );
    expect(
      container.querySelectorAll(".link-preview-card__image"),
    ).toHaveLength(preview.image ? 1 : 0);
  },
);
