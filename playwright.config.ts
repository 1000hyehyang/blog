import { defineConfig, devices } from "@playwright/test";
import { testHash, testSessionSecret } from "./tests/e2e/writer-credentials";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  use: { baseURL: "http://127.0.0.1:3100", trace: "on-first-retry" },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    env: {
      BLOG_E2E: "1",
      CONTENT_SOURCE: "local",
      LOCAL_CONTENT_PATH: "tests/fixtures/posts",
      WRITE_PASSWORD_HASH: testHash,
      WRITE_SESSION_SECRET: testSessionSecret,
      WRITE_ORIGIN: "http://127.0.0.1:3100",
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
});
