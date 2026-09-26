import { useState } from "react";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { TagInput } from "./tag-input";
import { WriterLogin } from "./writer-login";
import { ManagePosts } from "./manage-posts";
import { WriterSelect } from "./writer-controls";
import {
  saveDraft,
  readDraft,
  readDrafts,
  removeDraft,
  type LocalDraft,
} from "./local-drafts";
const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("commits comma-separated tag chips, removes them and unpacks the last chip with Backspace", () => {
  function Tags() {
    const [value, setValue] = useState("");
    return <TagInput value={value} onChange={setValue} />;
  }
  render(<Tags />);
  const input = screen.getByLabelText("태그");
  fireEvent.change(input, { target: { value: "React,한글," } });
  expect(
    screen.getByRole("button", { name: "한글 태그 삭제" }),
  ).toBeInTheDocument();
  fireEvent.keyDown(input, { key: "Backspace" });
  expect(input).toHaveValue("한글");
  expect(
    screen.queryByRole("button", { name: "한글 태그 삭제" }),
  ).not.toBeInTheDocument();
  fireEvent.compositionStart(input);
  fireEvent.keyDown(input, { key: "Enter", isComposing: true });
  expect(input).toHaveValue("한글");
  fireEvent.compositionEnd(input);
  fireEvent.keyDown(input, { key: "Enter" });
  fireEvent.click(screen.getByRole("button", { name: "React 태그 삭제" }));
  expect(
    screen.queryByRole("button", { name: "React 태그 삭제" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "한글 태그 삭제" }),
  ).toBeInTheDocument();
});

it("opens the select above the viewport edge and keeps keyboard selection", () => {
  const onChange = vi.fn();
  render(
    <WriterSelect
      label="카테고리"
      value="next"
      options={[
        { value: "next", label: "Next.js" },
        { value: "remix", label: "Remix" },
        { value: "vite", label: "Vite" },
      ]}
      onChange={onChange}
    />,
  );
  const trigger = screen.getByRole("combobox", { name: "카테고리" });
  vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(
    new DOMRect(20, window.innerHeight - 40, 180, 30),
  );
  fireEvent.click(trigger);
  expect(screen.getByRole("listbox", { name: "카테고리" }).style.bottom).toBe(
    "40px",
  );
  fireEvent.keyDown(trigger, { key: "End" });
  fireEvent.keyDown(trigger, { key: "Enter" });
  expect(onChange).toHaveBeenCalledWith("vite");
});

it("uses seven masked password slots, posts to the existing session API and retains retry access", async () => {
  let rejectLogin!: (response: Response) => void;
  const fetchMock = vi
    .fn()
    .mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        rejectLogin = resolve;
      }),
    )
    .mockResolvedValueOnce(Response.json({ ok: true }));
  vi.stubGlobal("fetch", fetchMock);
  const { container } = render(<WriterLogin configured destination="/write" />);
  expect(container.querySelectorAll("[data-filled]")).toHaveLength(7);
  expect(
    screen.queryByRole("button", { name: "로그인" }),
  ).not.toBeInTheDocument();
  const input = screen.getByLabelText("비밀번호");
  expect(input).toHaveAttribute("type", "password");
  expect(input).toHaveFocus();
  fireEvent.change(input, { target: { value: "123456?" } });
  expect(screen.queryByLabelText("인증 중")).not.toBeInTheDocument();
  rejectLogin(
    Response.json({ message: "비밀번호를 확인해 주세요." }, { status: 401 }),
  );
  await screen.findByText("비밀번호를 확인해 주세요.");
  expect(input).toHaveValue("");
  fireEvent.change(input, { target: { value: "731204!" } });
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/write"));
  expect(fetchMock.mock.calls[1]).toEqual([
    "/api/write/session",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ password: "731204!" }),
    }),
  ]);
});

it("keeps draft Markdown, pinned order and SHA locally and refuses stale overwrites/deletion", () => {
  const draft: LocalDraft = {
    post: {
      id: "id",
      slug: "draft-test",
      title: "제목",
      body: "# 원문\n\n- [ ] 체크\n",
      tags: ["한글"],
      category: { name: "Art", slug: "art" },
      coverImage: { src: "" },
      featured: false,
      published: false,
      createdAt: "2026-01-01T00:00:00Z",
      lastEditedAt: null,
      commentsCount: 0,
      reactionsCount: 0,
    },
    sha: null,
    savedAt: "2026-01-01T00:00:00Z",
    pinned: [],
    order: [],
  };
  saveDraft(draft, null);
  expect(readDrafts()).toEqual([draft]);
  expect(() =>
    saveDraft({ ...draft, post: { ...draft.post, body: "overwrite" } }, null),
  ).toThrow();
  expect(readDraft("draft-test")?.post.body).toBe(draft.post.body);
  const updated = { ...draft, savedAt: "2026-01-01T00:00:01Z" };
  saveDraft(updated, draft.savedAt);
  expect(() => removeDraft(draft.post.slug, draft.savedAt)).toThrow();
  const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  expect(() =>
    saveDraft({ ...updated, savedAt: "2026-01-01T00:00:02Z" }, updated.savedAt),
  ).toThrow("quota");
  expect(readDraft("draft-test")).toEqual(updated);
  set.mockRestore();
  removeDraft(draft.post.slug, updated.savedAt);
  expect(readDrafts()).toEqual([]);
});

it("deletes a published post with its current SHA", async () => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ deleted: true }));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("confirm", () => true);
  render(
    <ManagePosts
      posts={[
        {
          slug: "published-post",
          title: "발행된 글",
          category: { name: "Development", slug: "development" },
          published: true,
          createdAt: "2026-01-01T00:00:00Z",
          lastEditedAt: null,
          sha: "a".repeat(40),
        },
      ]}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "발행된 글 삭제" }));
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/write/posts/published-post",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ sha: "a".repeat(40) }),
      }),
    ),
  );
  expect(screen.queryByText("발행된 글")).not.toBeInTheDocument();
  expect(refresh).toHaveBeenCalled();
});

it("selects and deletes all filtered posts across pages with one confirmation", async () => {
  const fetchMock = vi.fn(async () => Response.json({ deleted: true }));
  const confirmMock = vi.fn().mockReturnValue(true);
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("confirm", confirmMock);
  render(
    <ManagePosts
      posts={Array.from({ length: 7 }, (_, index) => ({
        slug: `post-${index}`,
        title: `글 ${index}`,
        category: { name: "Development", slug: "development" },
        published: true,
        createdAt: "2026-01-01T00:00:00Z",
        lastEditedAt: null,
        sha: "a".repeat(40),
      }))}
    />,
  );
  fireEvent.click(screen.getByRole("checkbox", { name: "글 0 선택" }));
  expect(screen.getByRole("checkbox", { name: "전체 선택" })).toHaveAttribute(
    "aria-checked",
    "mixed",
  );
  fireEvent.click(screen.getByLabelText("전체 선택"));
  fireEvent.click(screen.getByRole("button", { name: "선택 삭제 (7)" }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(7));
  await screen.findByText("아직 발행한 포스트가 없어요");
  expect(confirmMock).toHaveBeenCalledTimes(1);
  expect(refresh).toHaveBeenCalled();
});

it("shows the management page's empty state when no posts remain", () => {
  render(<ManagePosts posts={[]} />);
  expect(screen.getByText("아직 발행한 포스트가 없어요")).toBeInTheDocument();
  expect(screen.getByText("새 글을 작성해 보세요.")).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "글 관리 0" }),
  ).toBeInTheDocument();
});
