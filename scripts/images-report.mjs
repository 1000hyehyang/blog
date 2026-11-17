import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { list } from "@vercel/blob";
import { z } from "zod";

const records = z.array(z.object({ key: z.string(), raw: z.string() }));
const backupSchema = z.object({
  version: z.literal(1),
  origin: z.url(),
  exportedAt: z.iso.datetime(),
  drafts: records,
  recovery: records,
});

/** @param {string} raw */
export function backupSources(raw) {
  const backup = backupSchema.parse(JSON.parse(raw));
  return [...backup.drafts, ...backup.recovery].map(({ raw }) => raw);
}

/**
 * @param {{ pathname: string; url: string }[]} blobs
 * @param {string[]} sources
 */
export function imageReferences(blobs, sources) {
  return blobs.map((blob) => {
    const filename = path.posix.basename(blob.pathname);
    // 전체 파일명을 비교해 다른 호스트 표기나 인코딩된 이미지 묶음도 보수적으로 보관한다.
    const referenced = sources.some(
      (source) =>
        source.includes(filename) ||
        source.includes(encodeURIComponent(filename)),
    );
    return { ...blob, referenced };
  });
}

async function main() {
  const [directory, ...backups] = process.argv.slice(2);
  if (directory === "--help") {
    console.log(
      "npm run images:report -- <content/posts directory> <writer-backup.json> [more backups...]\nReads Blob inventory and local copies only; never deletes files. Use a fresh content-branch checkout and backups from every browser.",
    );
    return;
  }
  if (!directory || backups.length === 0)
    throw new Error(
      "A current content/posts directory and at least one browser backup are required. See --help.",
    );
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const entries = await readdir(directory, { withFileTypes: true });
  const posts = entries.filter(({ name }) => name.endsWith(".md"));
  if (!posts.length || posts.some((entry) => !entry.isFile()))
    throw new Error(
      "The content directory must contain regular Markdown files. No inventory was requested.",
    );
  const sources = await Promise.all(
    posts.map(({ name }) => readFile(path.join(directory, name), "utf8")),
  );
  for (const file of backups)
    sources.push(...backupSources(await readFile(file, "utf8")));
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix: "posts/", limit: 1000, cursor });
    blobs.push(...page.blobs);
    if (page.hasMore && (!page.cursor || page.cursor === cursor))
      throw new Error(
        "Blob inventory pagination failed; no report was produced.",
      );
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  const results = imageReferences(blobs, sources);
  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        contentDirectory: path.resolve(directory),
        postFiles: posts.length,
        browserBackups: backups.length,
        notice:
          "Candidates only: references outside these inputs, Git history and in-progress uploads are unknown. Stop editing, verify all browser backups and retain a copy before manually deleting any file. Nothing was deleted.",
        referenced: results.filter(({ referenced }) => referenced),
        candidates: results.filter(({ referenced }) => !referenced),
      },
      null,
      2,
    ),
  );
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Image inventory failed.",
    );
    process.exitCode = 1;
  });
}
