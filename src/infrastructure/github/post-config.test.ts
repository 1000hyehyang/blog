import { afterEach, expect, it, vi } from "vitest";
import { readLocalPosts, usesGitHubStorage } from "./post-store";
vi.mock("server-only", () => ({}));
afterEach(() => vi.unstubAllEnvs());

it("rejects missing or misspelled production sources and a missing local content directory", async () => {
  vi.stubEnv("NODE_ENV", "production");
  for (const value of ["", "Github", "unknown"]) {
    vi.stubEnv("CONTENT_SOURCE", value);
    expect(() => usesGitHubStorage()).toThrow("CONTENT_SOURCE");
  }
  vi.stubEnv("CONTENT_SOURCE", "github");
  expect(usesGitHubStorage()).toBe(true);
  vi.stubEnv("CONTENT_SOURCE", "local");
  expect(usesGitHubStorage()).toBe(false);
  vi.stubEnv("LOCAL_CONTENT_PATH", "tests/fixtures/missing-content-directory");
  await expect(readLocalPosts()).rejects.toThrow();
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("CONTENT_SOURCE", "");
  expect(usesGitHubStorage()).toBe(false);
  expect(await readLocalPosts()).toEqual([]);
});
