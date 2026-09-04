import { load } from "js-yaml";

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

export function splitFrontmatterBlock(source: string): FrontmatterSplit {
  const lines = source.split("\n");
  if (lines[0]?.trim() !== "---") {
    return { raw: {}, body: source, valid: true };
  }

  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === "---",
  );
  if (closingIndex < 1) return { raw: {}, body: source, valid: false };

  const body = lines.slice(closingIndex + 1).join("\n");

  try {
    const parsed = load(lines.slice(1, closingIndex).join("\n"));
    const raw = parsed ?? {};
    if (typeof raw !== "object" || Array.isArray(raw)) {
      return { raw: {}, body, valid: false };
    }

    return {
      raw: raw as Record<string, unknown>,
      body,
      valid: true,
    };
  } catch {
    return { raw: {}, body, valid: false };
  }
}
