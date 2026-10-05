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
import type { StoredPost } from "@/lib/content/post-file";
import { readDraft, saveDraft, type LocalDraft } from "./local-drafts";
import { DraftEditor } from "./draft-editor";
import { Editor } from "@tiptap/react";
import { act } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@vercel/blob/client", () => ({ upload: mocks.upload }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));
const initial: StoredPost = {
  id: "post-id",
  slug: "sample-post",
  title: "원본 제목",
  body: "# 원본\n\n한글 본문\n\n---\n",
  tags: [],
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
  vi.stubGlobal(
    "Image",
    class {
      src = "";
      naturalWidth = 800;
      naturalHeight = 600;
      decode = async () => {};
    },
  );
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL() {
        return "blob:test-image";
      }
      static revokeObjectURL() {}
    },
  );
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
        this.dispatchEvent(new Event("close"));
      },
    },
  });
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});
describe("writer data preservation", () => {
  it("serializes the latest body only when saving, including edits immediately before save", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ message: "conflict" }, { status: 409 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <PostEditor initial={initial} initialSha={"a".repeat(40)} writable />,
    );
    const element = await screen.findByRole("textbox", { name: "본문 편집기" });
    const editor = (element as HTMLElement & { editor: Editor }).editor;
    const serialize = vi.spyOn(editor, "getMarkdown");
    act(() => {
      editor.commands.insertContentAt(1, "first");
      editor.commands.insertContentAt(1, "latest");
    });
    expect(serialize).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    fireEvent.click(screen.getByRole("button", { name: "수정 완료" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(serialize).toHaveBeenCalledOnce();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).post.body).toContain(
      "latestfirst",
    );
  });
  it("keeps the image folder ID through drafts and publishing, using the category selected for each upload", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ message: "test" }, { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);
    const view = render(
      <PostEditor initial={null} initialSha={null} writable />,
    );
    const editor = await screen.findByRole("textbox", { name: "본문 편집기" });
    const file = new File(["image"], "photo.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("이미지 파일 선택"), {
      target: { files: [file] },
    });
    await waitFor(() => expect(editor.querySelector("img")).not.toBeNull());
    await waitFor(() =>
      expect(editor).toHaveAttribute("contenteditable", "true"),
    );
    const path = mocks.upload.mock.calls[0][0] as string;
    expect(path).toMatch(
      /^posts\/development\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.png$/,
    );
    const id = path.split("/")[2];
    fireEvent.click(screen.getByRole("button", { name: "임시 저장" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "임시 저장",
      }),
    );
    await waitFor(() => expect(readDraft("post-1")?.post.id).toBe(id));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalled());
    view.unmount();

    render(<DraftEditor id="post-1" writable pinned={[]} />);
    const reopened = await screen.findByRole("textbox", {
      name: "본문 편집기",
    });
    const category = screen.getByRole("combobox", { name: "카테고리" });
    fireEvent.keyDown(category, { key: "a" });
    fireEvent.keyDown(category, { key: "Enter" });
    expect(category).toHaveTextContent("Art");
    mocks.upload.mockResolvedValueOnce({
      url: "https://test.public.blob.vercel-storage.com/second.png",
    });
    fireEvent.change(screen.getByLabelText("이미지 파일 선택"), {
      target: { files: [file] },
    });
    await waitFor(() =>
      expect(reopened.querySelector('img[src$="/second.png"]')).not.toBeNull(),
    );
    expect(mocks.upload.mock.calls[1][0]).toMatch(
      new RegExp(`^posts/art/${id}/[a-f0-9-]{36}\\.png$`),
    );
    await waitFor(() =>
      expect(reopened).toHaveAttribute("contenteditable", "true"),
    );
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    fireEvent.click(screen.getByRole("button", { name: "발행" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).post).toMatchObject({
      id,
      category: { slug: "art" },
    });
  });
  const oldPins = [
    { slug: "first", title: "First", coverImage: { src: "" } },
    { slug: "second", title: "Second", coverImage: { src: "" } },
  ];
  const latestPins = [
    oldPins[0],
    { slug: "third", title: "Third", coverImage: { src: "" } },
  ];

  it("reopens an old draft, resolves pinned conflicts and persists the new baseline without losing content", async () => {
    const draft: LocalDraft = {
      post: { ...initial, published: false },
      sha: null,
      savedAt: "2026-01-01T00:00:00Z",
      pinned: oldPins,
      order: ["second", "first"],
    };
    saveDraft(draft, null);
    const view = render(
      <DraftEditor id={draft.post.slug} writable pinned={latestPins} />,
    );
    await screen.findByRole("textbox", { name: "본문 편집기" });
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    expect(screen.getByRole("button", { name: "발행" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "내 고정 변경 반영" }));
    expect(screen.getByRole("button", { name: "발행" })).toBeEnabled();
    expect(
      within(screen.getByRole("dialog"))
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["First", "Third"]);
    fireEvent.click(screen.getByRole("button", { name: "발행 설정 닫기" }));
    fireEvent.click(screen.getByRole("button", { name: "임시 저장" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "임시 저장",
      }),
    );
    await waitFor(() =>
      expect(readDraft(draft.post.slug)?.pinned).toEqual(latestPins),
    );
    expect(readDraft(draft.post.slug)?.post.body).toBe(initial.body);
    await waitFor(() => expect(mocks.replace).toHaveBeenCalled());
    view.unmount();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ post: draft.post, sha: "b".repeat(40) }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<DraftEditor id={draft.post.slug} writable pinned={latestPins} />);
    await screen.findByRole("textbox", { name: "본문 편집기" });
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    expect(
      screen.queryByRole("button", { name: "내 고정 변경 반영" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "발행" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      post: { body: initial.body },
      pinned: { base: ["first", "third"], order: ["first", "third"] },
    });
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/manage"));
  });

  it("resolves a pinned conflict returned during publishing and retries the same content", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          {
            message: "목록 충돌",
            conflict: { kind: "pinned", posts: latestPins },
          },
          { status: 409 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({ post: initial, sha: "b".repeat(40) }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <PostEditor
        initial={initial}
        initialSha={"a".repeat(40)}
        writable
        pinned={oldPins}
      />,
    );
    await screen.findByRole("textbox", { name: "본문 편집기" });
    fireEvent.change(screen.getByLabelText("제목"), {
      target: { value: "My unsaved edit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    fireEvent.click(screen.getByRole("button", { name: "수정 완료" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "최신 고정 목록 사용" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "수정 완료" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      sha: "a".repeat(40),
      post: { title: "My unsaved edit", body: initial.body },
      pinned: { base: ["first", "third"], order: ["first", "third"] },
    });
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/manage"));
  });

  it("allocates a new URL without reading or overwriting damaged draft bodies", async () => {
    localStorage.setItem("blog:writer:draft:post-12", "{");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ message: "test" }, { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<PostEditor initial={null} initialSha={null} writable />);
    await screen.findByRole("textbox", { name: "본문 편집기" });
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    fireEvent.click(screen.getByRole("button", { name: "발행" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/write/posts/post-13");
    expect(localStorage.getItem("blog:writer:draft:post-12")).toBe("{");
  });
  it("shows a preview card when a standalone Markdown URL is pasted", async () => {
    const url = "https://github.com/1000hyehyang";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ url, hostname: "github.com", title: "GitHub profile" }),
      ),
    );
    render(<PostEditor initial={null} initialSha={null} writable />);
    const editor = await screen.findByRole("textbox", { name: "본문 편집기" });
    fireEvent.paste(editor, {
      clipboardData: { files: [], getData: () => `[${url}](${url})` },
    });

    expect(editor.querySelector(`p > a[href="${url}"]`)).toHaveTextContent(url);
    expect(await screen.findByText("GitHub profile")).toBeInTheDocument();
    expect(editor.querySelector(".link-preview-card")).toHaveAttribute(
      "href",
      url,
    );
  });
  it("shows the published YouTube player while editing a standalone video URL", async () => {
    const url = "https://youtu.be/s_91Rtt1iqU";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<PostEditor initial={null} initialSha={null} writable />);
    const editor = await screen.findByRole("textbox", { name: "본문 편집기" });
    fireEvent.paste(editor, {
      clipboardData: { files: [], getData: () => `[${url}](${url})` },
    });

    await waitFor(() =>
      expect(
        editor.querySelector("[data-youtube-player] iframe"),
      ).toHaveAttribute(
        "src",
        "https://www.youtube-nocookie.com/embed/s_91Rtt1iqU?rel=0",
      ),
    );
    expect(editor.querySelector("p + .standalone-link-widget")).not.toBeNull();
    expect(
      editor.querySelector(".standalone-link-widget > [contenteditable=false]"),
    ).not.toBeNull();
    expect(editor.querySelector(".link-preview-card")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
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
      expect.stringMatching(
        /^posts\/development\/post-id\/[a-f0-9-]{36}\.png$/,
      ),
      file,
      expect.objectContaining({
        access: "public",
        handleUploadUrl: "/api/write/images",
      }),
    );
    await waitFor(() =>
      expect(editor).toHaveAttribute("contenteditable", "true"),
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
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
  it("chooses a multi-image layout, retries only failed uploads and inserts one group", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ message: "충돌입니다" }, { status: 409 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    let preview = 0;
    const createObjectURL = vi.fn(() => `blob:preview-${++preview}`);
    const revokeObjectURL = vi.fn();
    vi.stubGlobal(
      "URL",
      class extends URL {
        static createObjectURL = createObjectURL;
        static revokeObjectURL = revokeObjectURL;
      },
    );
    mocks.upload
      .mockResolvedValueOnce({ url: "https://example.com/first.png" })
      .mockRejectedValueOnce(new Error("업로드 실패"))
      .mockResolvedValueOnce({ url: "https://example.com/second.png" });
    render(
      <PostEditor initial={initial} initialSha={"a".repeat(40)} writable />,
    );
    const editor = await screen.findByRole("textbox", { name: "본문 편집기" });
    const first = new File(["first"], "first.png", { type: "image/png" });
    const second = new File(["second"], "second.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("이미지 파일 선택"), {
      target: { files: [first, second] },
    });
    const dialog = screen.getByRole("dialog", { name: "사진 첨부 방식" });
    expect(dialog).toBeVisible();
    fireEvent.click(within(dialog).getByRole("button", { name: "콜라주" }));
    expect(within(dialog).queryByLabelText("사진 순서")).toBeNull();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "본문에 삽입" }),
    );
    await within(dialog).findByText("업로드 실패");
    expect(editor.querySelectorAll("figure img")).toHaveLength(0);
    expect(mocks.upload.mock.calls[0][1]).toBe(first);
    expect(mocks.upload.mock.calls[1][1]).toBe(second);
    fireEvent.click(
      within(dialog).getByRole("button", { name: "업로드 재시도" }),
    );
    await waitFor(() =>
      expect(editor.querySelectorAll("figure img")).toHaveLength(2),
    );
    expect(mocks.upload).toHaveBeenCalledTimes(3);
    expect(mocks.upload.mock.calls[2][1]).toBe(second);
    expect(editor.querySelector("figure")).not.toHaveAttribute("data-selected");
    expect(editor.querySelector("figure [data-layout]")).toHaveAttribute(
      "data-layout",
      "collage",
    );
    expect(revokeObjectURL.mock.calls.map(([url]) => url).sort()).toEqual(
      createObjectURL.mock.results.map(({ value }) => value).sort(),
    );
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    fireEvent.click(screen.getByRole("button", { name: "수정 완료" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).post.body).toContain(
      "blog-image-group:v1:",
    );
  });
  it("inserts individual photos as separate editable images", async () => {
    let preview = 0;
    vi.stubGlobal(
      "URL",
      class extends URL {
        static createObjectURL = vi.fn(() => `blob:preview-${++preview}`);
        static revokeObjectURL = vi.fn();
      },
    );
    mocks.upload.mockImplementation(async (_path, file: File) => ({
      url: `https://example.com/${file.name}`,
    }));
    render(
      <PostEditor initial={initial} initialSha={"a".repeat(40)} writable />,
    );
    const editor = await screen.findByRole("textbox", { name: "본문 편집기" });
    fireEvent.change(screen.getByLabelText("이미지 파일 선택"), {
      target: {
        files: [
          new File(["one"], "one.png", { type: "image/png" }),
          new File(["two"], "two.png", { type: "image/png" }),
        ],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "본문에 삽입" }));
    await waitFor(() =>
      expect(editor.querySelectorAll("figure img")).toHaveLength(2),
    );
    await waitFor(() =>
      expect(editor).toHaveAttribute("contenteditable", "true"),
    );
    expect(editor.querySelector("[data-layout]")).toBeNull();
    expect(
      editor.querySelectorAll('figure[class*="imageFigure"]'),
    ).toHaveLength(2);
  });
  it("sets a selected image as the cover and saves its layout and caption", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ message: "충돌입니다" }, { status: 409 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <PostEditor
        initial={{
          ...initial,
          body: "![설명](https://example.com/image.png)",
        }}
        initialSha={"a".repeat(40)}
        writable
      />,
    );
    const editor = await screen.findByRole("textbox", { name: "본문 편집기" });
    fireEvent.click(editor.querySelector("img")!);
    expect(screen.getByLabelText("이미지 설정")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "대표 이미지로 설정" }));
    fireEvent.click(screen.getByRole("button", { name: "오른쪽 정렬" }));
    expect(
      editor.querySelector('button[aria-label="대표 이미지로 설정"]'),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "오른쪽 아래 이미지 크기 조절" }),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("이미지를 설명해 보세요"),
    ).toBeInTheDocument();
    const caption = screen.getByRole("textbox", { name: "캡션" });
    fireEvent.change(caption, {
      target: { value: "사진 설명" },
    });
    fireEvent.blur(caption);
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    fireEvent.click(screen.getByRole("button", { name: "수정 완료" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const post = JSON.parse(fetchMock.mock.calls[0][1].body).post;
    expect(post.coverImage.src).toBe("https://example.com/image.png");
    expect(post.body).toContain("blog-image:v1:");
  });
  it("clears the representative image when its body image is deleted", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ message: "충돌입니다" }, { status: 409 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <PostEditor
        initial={{
          ...initial,
          body: "![설명](https://example.com/image.png)",
          coverImage: { src: "https://example.com/image.png" },
        }}
        initialSha={"a".repeat(40)}
        writable
      />,
    );
    const editor = await screen.findByRole("textbox", { name: "본문 편집기" });
    fireEvent.click(editor.querySelector("img")!);
    fireEvent.click(screen.getByRole("button", { name: "사진 삭제" }));
    expect(editor.querySelector("img")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    fireEvent.click(screen.getByRole("button", { name: "수정 완료" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(
      JSON.parse(fetchMock.mock.calls[0][1].body).post.coverImage.src,
    ).toBe("");
  });
  it("shows one active representative control when an image URL is inserted twice", async () => {
    render(
      <PostEditor
        initial={{
          ...initial,
          body: "![첫 번째](https://example.com/image.png)\n\n![두 번째](https://example.com/image.png)",
          coverImage: { src: "https://example.com/image.png" },
        }}
        initialSha={"a".repeat(40)}
        writable
      />,
    );
    const editor = await screen.findByRole("textbox", { name: "본문 편집기" });
    expect(editor.querySelectorAll("img")).toHaveLength(2);
    expect(
      editor.querySelectorAll(
        'button[aria-label="대표 이미지로 설정"][aria-pressed="true"]',
      ),
    ).toHaveLength(1);
  });
  it("edits a table through contextual handles and saves the result", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ message: "충돌입니다" }, { status: 409 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <PostEditor
        initial={{ ...initial, body: "| A | B |\n| --- | --- |\n| 1 | 2 |" }}
        initialSha={"a".repeat(40)}
        writable
      />,
    );
    const editor = await screen.findByRole("textbox", { name: "본문 편집기" });
    expect(
      screen.queryByRole("group", { name: "표 설정" }),
    ).not.toBeInTheDocument();
    const cell = editor.querySelector("tr:last-child td")!;
    fireEvent.mouseMove(cell);
    fireEvent.click(await screen.findByRole("button", { name: "2행 메뉴" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "아래에 행 추가" }));
    expect(editor.querySelectorAll("tr")).toHaveLength(3);
    fireEvent.mouseMove(editor.querySelector("tr:last-child td")!);
    fireEvent.click(screen.getByRole("button", { name: "1열 메뉴" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "오른쪽에 열 추가" }));
    expect(editor.querySelector("tr")?.children).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    fireEvent.click(screen.getByRole("button", { name: "수정 완료" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body).post.body;
    expect(body).toContain("| A");
    expect(
      body.split("\n").filter((line: string) => line.startsWith("|")),
    ).toHaveLength(4);
  });
  it("duplicates a row and column through their menus", async () => {
    render(
      <PostEditor
        initial={{ ...initial, body: "| A | B |\n| --- | --- |\n| 1 | 2 |" }}
        initialSha={"a".repeat(40)}
        writable
      />,
    );
    const editor = await screen.findByRole("textbox", { name: "본문 편집기" });
    fireEvent.mouseMove(editor.querySelector("tr:last-child td")!);
    fireEvent.click(screen.getByRole("button", { name: "2행 메뉴" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "행 복제" }));
    expect(editor.querySelectorAll("tr")).toHaveLength(3);
    expect(editor.querySelector("tr:last-child")?.textContent).toBe("12");
    fireEvent.mouseMove(editor.querySelector("tr:last-child td")!);
    fireEvent.click(screen.getByRole("button", { name: "1열 메뉴" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "열 복제" }));
    expect(editor.querySelector("tr:last-child")?.textContent).toBe("112");
    expect(editor.querySelector("tr")?.children).toHaveLength(3);
    fireEvent.mouseMove(editor.querySelector("tr:last-child td")!);
    fireEvent.click(screen.getByRole("button", { name: "마지막에 행 추가" }));
    expect(editor.querySelectorAll("tr")).toHaveLength(4);
    fireEvent.mouseMove(editor.querySelector("tr:last-child td")!);
    fireEvent.click(screen.getByRole("button", { name: "마지막에 열 추가" }));
    expect(editor.querySelector("tr")?.children).toHaveLength(4);
    fireEvent.mouseMove(editor.querySelector("tr:last-child td:last-child")!);
    const rowHandle = screen.getByRole("button", { name: "4행 메뉴" });
    fireEvent.click(rowHandle);
    fireEvent.mouseLeave(rowHandle.parentElement!);
    const deleteRow = screen.getByRole("menuitem", { name: "행 삭제" });
    fireEvent.pointerDown(deleteRow);
    expect(deleteRow).toBeInTheDocument();
    fireEvent.click(deleteRow);
    expect(editor.querySelectorAll("tr")).toHaveLength(3);
    fireEvent.mouseMove(editor.querySelector("tr:last-child td:last-child")!);
    const columnHandle = screen.getByRole("button", { name: "4열 메뉴" });
    fireEvent.click(columnHandle);
    fireEvent.mouseLeave(columnHandle.parentElement!);
    const deleteColumn = screen.getByRole("menuitem", { name: "열 삭제" });
    fireEvent.pointerDown(deleteColumn);
    expect(deleteColumn).toBeInTheDocument();
    fireEvent.click(deleteColumn);
    expect(editor.querySelector("tr")?.children).toHaveLength(3);
    fireEvent.mouseMove(editor.querySelector("tr:last-child td")!);
    fireEvent.click(screen.getByRole("button", { name: "표 메뉴" }));
    fireEvent.click(
      screen.getByRole("menuitem", { name: "표 아래에 문단 추가" }),
    );
    expect(
      editor.querySelector(".tableWrapper")?.nextElementSibling?.tagName,
    ).toBe("P");
    fireEvent.mouseMove(editor.querySelector("tr:last-child td")!);
    fireEvent.click(screen.getByRole("button", { name: "표 메뉴" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "표 삭제" }));
    expect(editor.querySelector("table")).not.toBeInTheDocument();
  });
  it("inserts a plain 3 by 3 table without a creation panel", async () => {
    render(<PostEditor initial={null} initialSha={null} writable />);
    const editor = await screen.findByRole("textbox", { name: "본문 편집기" });
    fireEvent.click(screen.getByRole("button", { name: "표" }));
    expect(
      screen.queryByRole("group", { name: "새 표 만들기" }),
    ).not.toBeInTheDocument();
    expect(editor.querySelectorAll("tr")).toHaveLength(3);
    expect(editor.querySelector("tr")?.children).toHaveLength(3);
    expect(editor.querySelector("th")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "표 설정" }),
    ).not.toBeInTheDocument();
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
