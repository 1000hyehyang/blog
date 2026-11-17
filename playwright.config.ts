import { defineConfig, devices } from "@playwright/test";
import {
  testClientId,
  testClientSecret,
  testGitHubUserId,
  testSessionSecret,
} from "./tests/e2e/writer-credentials";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  use: { baseURL: "http://127.0.0.1:3100", trace: "on-first-retry" },
  webServer: {
    command: `npm run ${process.env.BLOG_E2E_PRODUCTION === "1" ? "start" : "dev"} -- --hostname 127.0.0.1 --port 3100`,
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    env: {
      BLOG_E2E: "1",
      CONTENT_SOURCE: "local",
      LOCAL_CONTENT_PATH: "tests/fixtures/posts",
      GITHUB_TOKEN: "",
      WRITE_GITHUB_CLIENT_ID: testClientId,
      WRITE_GITHUB_CLIENT_SECRET: testClientSecret,
      WRITE_GITHUB_USER_ID: testGitHubUserId,
      WRITE_SESSION_SECRET: testSessionSecret,
      WRITE_ORIGIN: "http://127.0.0.1:3100",
      WRITE_TRUST_PROXY: "1",
      NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --import=${pathToFileURL(resolve("tests/e2e/github-oauth-mock.mjs")).href}`,
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
});
