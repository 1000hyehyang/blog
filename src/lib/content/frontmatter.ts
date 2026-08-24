import matter from "gray-matter";

type FrontmatterSplit = {
  raw: Record<string, unknown>;
  body: string;
  valid: boolean;
};

/** GitHub Discussion Form이 textarea 값 앞에 붙이는 제목을 제거한다. */
export function normalizeDiscussionSource(source: string) {
  const lines = source.split("\n");
  const firstContentIndex = lines.findIndex((line) => line.trim());

  if (!/^###\s+포스트 본문\s*$/.test(lines[firstContentIndex] ?? "")) {
    return source;
  }

  const frontmatterIndex = lines.findIndex(
    (line, index) => index > firstContentIndex && line.trim() === "---",
  );

  return frontmatterIndex > firstContentIndex
    ? lines.slice(frontmatterIndex).join("\n")
    : source;
}

function bodyAfterFrontmatter(source: string) {
  const lines = source.split("\n");
  if (lines[0]?.trim() !== "---") return source;

  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === "---",
  );

  return closingIndex > 0 ? lines.slice(closingIndex + 1).join("\n") : source;
}

export function splitFrontmatterBlock(source: string): FrontmatterSplit {
  try {
    const parsed = matter(source);
    return {
      raw: parsed.data as Record<string, unknown>,
      body: parsed.content,
      valid: true,
    };
  } catch {
    return {
      raw: {},
      body: bodyAfterFrontmatter(source),
      valid: false,
    };
  }
}
