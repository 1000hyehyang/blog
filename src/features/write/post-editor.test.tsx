import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PostEditor } from "./post-editor";
import type { FilePost } from "@/lib/content/post-file";

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@vercel/blob/client", () => ({ upload: mocks.upload }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));
const initial: FilePost = {
  id: "post-id",
  slug: "sample-post",
  title: "원본 제목",
  body: "# 원본\n\n한글 본문\n\n---\n",
  tags: [],
  excerpt: "",
  category: { name: "Development", slug: "development" },
  coverImage: { src: "" },
  featured: false,
  published: true,
  createdAt: "2026-01-01T00:00:00Z",
  lastEditedAt: null,
  commentsCount: 0,
  reactionsCount: 0,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.upload.mockResolvedValue({
    url: "https://test.public.blob.vercel-storage.com/image.png",
  });
  Object.defineProperties(Range.prototype, {
    getClientRects: { configurable: true, value: () => [] },
    getBoundingClientRect: { configurable: true, value: () => new DOMRect() },
  });
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute("open", "");
      },
    },
    close: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute("open");
      },
    },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("writer data preservation", () => {
  it("generates one URL across retries and submits the visible card order", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async () =>
        Response.json({ message: "재시도" }, { status: 502 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <PostEditor
        initial={null}
        initialSha={null}
        writable
        pinned={[
          {
            slug: "first",
            title: "첫 번째 글",
            coverImage: { src: "https://example.com/a.png" },
          },
          { slug: "second", title: "두 번째 글", coverImage: { src: "" } },
        ]}
      />,
    );
    await screen.findByRole("textbox", { name: "본문 편집기" });
    fireEvent.change(screen.getByLabelText("제목"), {
      target: { value: "새 글" },
    });
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    expect(screen.queryByLabelText("글 주소")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("요약")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /다운로드/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Pinned" }));
    fireEvent.keyDown(screen.getByRole("button", { name: "새 글 순서 이동" }), {
      key: "ArrowUp",
    });
    expect(
      within(screen.getByRole("dialog"))
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["첫 번째 글", "새 글", "두 번째 글"]);
    fireEvent.click(
      screen.getByRole("button", { name: "두 번째 글 Pinned 해제" }),
    );
    expect(
      within(screen.getByRole("dialog"))
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["첫 번째 글", "새 글"]);
    fireEvent.click(screen.getByRole("button", { name: "발행" }));
    await within(screen.getByRole("dialog")).findByText("재시도");
    const url = fetchMock.mock.calls[0][0];
    expect(url).toBe("/api/write/posts/post-1");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).pinned).toEqual({
      base: ["first", "second"],
      order: ["first", url.split("/").at(-1)],
    });
    fireEvent.click(await screen.findByRole("button", { name: "다시 시도" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][0]).toBe(url);
  });
  it("supports keyboard category selection and preserves hidden Art image values", async () => {
    render(
      <PostEditor
        initial={{
          ...initial,
          galleryImage: { src: "https://example.com/art.png" },
        }}
        initialSha={"a".repeat(40)}
        writable
      />,
    );
    await screen.findByRole("textbox", { name: "본문 편집기" });
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    expect(screen.queryByLabelText("갤러리 이미지")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "발행 설정 닫기" }));
    const category = screen.getByRole("combobox", { name: "카테고리" });
    fireEvent.keyDown(category, { key: "a" });
    expect(category).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(category, { key: "Enter" });
    expect(category).toHaveTextContent("Art");
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    expect(screen.getByLabelText("갤러리 이미지")).toHaveValue(
      "https://example.com/art.png",
    );
  });
  it("preserves the original Markdown on metadata-only edits and retains it after a conflict", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ message: "충돌입니다" }, { status: 409 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <PostEditor initial={initial} initialSha={"a".repeat(40)} writable />,
    );
    await screen.findByRole("textbox", { name: "본문 편집기" });
    fireEvent.change(screen.getByLabelText("제목"), {
      target: { value: "수정 제목" },
    });
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    fireEvent.click(screen.getByRole("button", { name: "수정 완료" }));
    await within(screen.getByRole("dialog")).findByText("충돌입니다");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      sha: "a".repeat(40),
      post: { body: initial.body, title: "수정 제목" },
    });
    expect(screen.getByLabelText("제목")).toHaveValue("수정 제목");
    expect(mocks.replace).not.toHaveBeenCalled();
  });
  it("inserts the returned image URL and keeps it after an upload failure", async () => {
    render(
      <PostEditor initial={initial} initialSha={"a".repeat(40)} writable />,
    );
    const editor = await screen.findByRole("textbox", { name: "본문 편집기" });
    const file = new File(["image"], "photo.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("이미지 파일 선택"), {
      target: { files: [file] },
    });
    await waitFor(() =>
      expect(editor.querySelector("img")).toHaveAttribute(
        "src",
        "https://test.public.blob.vercel-storage.com/image.png",
      ),
    );
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^posts\/.+\.png$/),
      file,
      expect.objectContaining({
        access: "public",
        handleUploadUrl: "/api/write/images",
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "이미지를 추가했습니다. 글을 저장해 주세요.",
      ),
    );
    mocks.upload.mockRejectedValueOnce(new Error("업로드 실패"));
    fireEvent.paste(editor, {
      clipboardData: { files: [file], getData: () => "" },
    });
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("업로드 실패"),
    );
    expect(editor).toHaveTextContent("한글 본문");
    expect(editor.querySelectorAll("img")).toHaveLength(1);
  });
  it("returns to management after publishing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        sha: "b".repeat(40),
        pinned: [],
        post: initial,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<PostEditor initial={null} initialSha={null} writable />);
    await screen.findByRole("textbox", {
      name: "본문 편집기",
    });
    expect(
      screen.queryByRole("button", { name: "링크" }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("제목"), {
      target: { value: "링크 테스트" },
    });
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    fireEvent.click(screen.getByRole("button", { name: "발행" }));
    expect(
      await screen.findByRole("button", { name: "발행 완료" }),
    ).toBeDisabled();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/manage"));
  });
  it("shows feedback only on the clicked action button", async () => {
    let respond!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>((resolve) => (respond = resolve))),
    );
    render(
      <PostEditor initial={initial} initialSha={"a".repeat(40)} writable />,
    );
    await screen.findByRole("textbox", { name: "본문 편집기" });
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    fireEvent.click(screen.getByRole("button", { name: "수정 완료" }));

    const drawer = screen.getByRole("dialog", { name: "발행 설정" });
    expect(
      await within(drawer).findByRole("button", { name: "수정 중" }),
    ).toHaveAttribute("aria-busy", "true");
    expect(
      within(drawer).getByRole("button", { name: "삭제" }),
    ).toBeInTheDocument();
    expect(
      within(drawer).getByRole("heading", { name: "발행 설정" }),
    ).toBeInTheDocument();

    respond(Response.json({ message: "다시 시도해 주세요." }, { status: 502 }));
    expect(
      await within(drawer).findByRole("button", { name: "다시 시도" }),
    ).toBeEnabled();
    expect(within(drawer).getByRole("button", { name: "삭제" })).toBeEnabled();
  });
});
