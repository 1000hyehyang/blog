import { load } from "js-yaml";

type FrontmatterSplit = {
  raw: Record<string, unknown>;
  body: string;
  valid: boolean;
};

const EMPTY_FORM_RESPONSES = new Set([
  "",
  "No response",
  "_No response_",
  "응답 없음",
  "_응답 없음_",
]);

function readFormSections(source: string) {
  const sections = new Map<string, string>();
  const headings = [...source.matchAll(/^###\s+(.+?)\s*$/gm)];

  headings.forEach((heading, index) => {
    const start = (heading.index ?? 0) + heading[0].length;
    const end = headings[index + 1]?.index ?? source.length;
    sections.set(heading[1], source.slice(start, end).trim());
  });

  return sections;
}

function formResponse(value?: string) {
  const response = value?.trim() ?? "";
  return EMPTY_FORM_RESPONSES.has(response) ? undefined : response;
}

function formImageUrl(value?: string) {
  return formResponse(value)?.match(/https?:\/\/[^\s)>]+/)?.[0];
}

export function splitDiscussionForm(source: string): FrontmatterSplit | null {
  const bodyHeading = /^###\s+포스트 본문\s*$/m.exec(source);
  if (!bodyHeading?.index) return null;

  const sections = readFormSections(source.slice(0, bodyHeading.index));
  if (!sections.has("공개 상태")) return null;

  const tags = formResponse(sections.get("태그"))
    ?.split(/[\n,]/)
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean);

  return {
    raw: {
      coverImage: formImageUrl(sections.get("대표 이미지")),
      galleryImage: formImageUrl(sections.get("갤러리 이미지")),
      featured: formResponse(sections.get("Featured")) === "예",
      featuredOrder: formResponse(sections.get("Featured 순서")),
      published: formResponse(sections.get("공개 상태")) === "공개",
      tags: tags ?? [],
    },
    body: source
      .slice(bodyHeading.index + bodyHeading[0].length)
      .replace(/^\s+/, ""),
    valid: true,
  };
}

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
