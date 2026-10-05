import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const execute = promisify(execFile);
let checkout;

if (process.argv.includes("--help")) {
  console.log(
    "npm run content:index\nRebuild the GitHub post index using the repository settings in .env.\nRequires Node.js 22.18+; does not change Markdown files.",
  );
  process.exit(0);
}
if (!process.argv.includes("--write") && !process.argv.includes("--check")) {
  console.error(
    "Use --write to commit the rebuilt index, --check to validate local content, or --help for usage.",
  );
  process.exit(1);
}
try {
  process.loadEnvFile();
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

// Node.js에서 TypeScript의 경로 별칭과 생략된 확장자를 해석한다.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/"))
      specifier = new URL(`../src/${specifier.slice(2)}`, import.meta.url).href;
    if (specifier === "next/cache") specifier = "next/cache.js";
    if (specifier.startsWith(".") || specifier.startsWith("file:")) {
      const url = new URL(specifier, context.parentURL ?? import.meta.url);
      for (const suffix of [".ts", "/index.ts"]) {
        if (existsSync(fileURLToPath(`${url}${suffix}`))) {
          specifier = `${url}${suffix}`;
          break;
        }
      }
    }
    return nextResolve(specifier, context);
  },
});

try {
  const { rebuildPostIndex } =
    await import("../src/infrastructure/github/post-mutations.ts");
  const { getStoredPostsWithSha } =
    await import("../src/infrastructure/github/post-store.ts");
  if (process.argv.includes("--check")) {
    if (process.env.CONTENT_SOURCE === "github")
      throw new Error(
        "--check requires CONTENT_SOURCE=local; it never writes to GitHub.",
      );
    const posts = await getStoredPostsWithSha();
    console.log(`Validated ${posts.length} local posts.`);
  } else {
    const { GITHUB_OWNER, GITHUB_REPO, GITHUB_CONTENT_BRANCH, GITHUB_TOKEN } =
      process.env;
    if (
      process.env.CONTENT_SOURCE !== "github" ||
      !GITHUB_OWNER ||
      !GITHUB_REPO ||
      !GITHUB_CONTENT_BRANCH ||
      !GITHUB_TOKEN
    )
      throw new Error("GitHub content repository settings are required.");
    checkout = await mkdtemp(path.join(os.tmpdir(), "blog-index-"));
    // 토큰이 명령 인자나 파일에 남지 않도록 환경 변수로 전달한다.
    const credentials = Buffer.from(`x-access-token:${GITHUB_TOKEN}`).toString(
      "base64",
    );
    const env = {
      ...process.env,
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
      GIT_CONFIG_VALUE_0: `Authorization: Basic ${credentials}`,
      GIT_TERMINAL_PROMPT: "0",
      GIT_TRACE: "0",
      GIT_TRACE_CURL: "0",
      GIT_CURL_VERBOSE: "0",
    };
    const options = {
      env,
      windowsHide: true,
      encoding: "utf8",
      timeout: 300_000,
      maxBuffer: 16 * 1024 * 1024,
    };
    await execute(
      "git",
      [
        "-c",
        "core.autocrlf=false",
        "clone",
        "--depth=1",
        "--single-branch",
        "--no-tags",
        "--branch",
        GITHUB_CONTENT_BRANCH,
        `https://github.com/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}.git`,
        checkout,
      ],
      options,
    );
    const { stdout: head } = await execute(
      "git",
      ["-C", checkout, "rev-parse", "HEAD"],
      options,
    );
    const { stdout: tree } = await execute(
      "git",
      ["-C", checkout, "ls-tree", "-r", "HEAD"],
      options,
    );
    const { parsePostFile, slugSchema } =
      await import("../src/lib/content/post-file.ts");
    const posts = [];
    for (const line of tree.split("\n")) {
      const match =
        /^\d{6} blob ([a-f0-9]{40})\t(content\/posts\/([^/]+)\.md)$/.exec(line);
      if (!match) continue;
      const slug = slugSchema.parse(match[3]);
      posts.push({
        post: parsePostFile(
          await readFile(path.join(checkout, match[2]), "utf8"),
          slug,
        ),
        sha: match[1],
      });
    }
    const result = await rebuildPostIndex({ ref: head.trim(), posts });
    console.log(
      `Indexed ${result.posts} posts (${result.published} published).`,
    );
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Index rebuild failed.",
  );
  process.exitCode = 1;
} finally {
  if (
    checkout &&
    path.dirname(path.resolve(checkout)) === path.resolve(os.tmpdir()) &&
    path.basename(checkout).startsWith("blog-index-")
  )
    await rm(checkout, { recursive: true, force: true });
}
