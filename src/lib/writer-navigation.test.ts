import { expect, it, vi, beforeEach } from "vitest";
import { writerDestination } from "./writer-navigation";
import WritePage from "@/app/write/page";
import ManagePage from "@/app/manage/page";
import LoginPage from "@/app/login/page";

const mocks = vi.hoisted(() => ({ authenticated: false, read: vi.fn() }));
vi.mock("@/lib/writer-auth", () => ({
  isWriter: async () => mocks.authenticated,
  writerConfigured: () => true,
}));
vi.mock("@/infrastructure/github/posts", () => ({
  getStoredPost: mocks.read,
  getStoredPosts: mocks.read,
  getStoredPostsWithSha: mocks.read,
  usesGitHubStorage: () => true,
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
  notFound: () => {
    throw new Error("not found");
  },
}));
vi.mock("@/features/write/post-editor", () => ({ PostEditor: () => null }));
vi.mock("@/features/write/writer-login", () => ({ WriterLogin: () => null }));
vi.mock("@/features/write/writer-header", () => ({ WriterHeader: () => null }));
beforeEach(() => {
  mocks.authenticated = false;
  mocks.read.mockClear();
});

it("only permits known admin destinations, never external redirects", () => {
  expect(writerDestination("/write?slug=post-1")).toBe("/write?slug=post-1");
  expect(writerDestination("/write")).toBe("/write");
  for (const value of [
    undefined,
    ["/write"],
    "https://attacker.example",
    "//attacker.example",
    "/write?slug=../escape",
    "/write?slug=a&next=https://evil",
    "/write?slug=a&slug=b",
  ])
    expect(writerDestination(value)).toBe("/manage");
});
it("redirects before reading any protected content and retains the requested edit", async () => {
  await expect(
    WritePage({ searchParams: Promise.resolve({ slug: "post-1" }) }),
  ).rejects.toThrow("redirect:/login?next=%2Fwrite%3Fslug%3Dpost-1");
  await expect(ManagePage()).rejects.toThrow("redirect:/login?next=%2Fmanage");
  expect(mocks.read).not.toHaveBeenCalled();
});
it("already authenticated administrators skip login safely", async () => {
  mocks.authenticated = true;
  await expect(
    LoginPage({ searchParams: Promise.resolve({ next: "/write" }) }),
  ).rejects.toThrow("redirect:/write");
  await expect(
    LoginPage({
      searchParams: Promise.resolve({ next: "//attacker.example" }),
    }),
  ).rejects.toThrow("redirect:/manage");
});
