import { isBareHttpUrl } from "./text";

/**
 * frontmatter 파싱 후 본문에 남은 잔여물(frontmatter 라인, 템플릿 placeholder,
 * 대표 이미지 URL 등)을 제거해 렌더링 가능한 본문만 남긴다.
 */

const FRONTMATTER_FIELD_LINE =
  /^(?:---|slug:|excerpt:|coverImage:|featured:|featuredOrder:|published:|tags:)/;

const TEMPLATE_PLACEHOLDER_LINES = new Set([
  "본문을 작성하세요.",
  "CS 개념과 정리를 작성하세요.",
  "공부 내용을 정리하세요.",
  "작업 과정과 생각을 작성하세요.",
  "글을 작성하세요.",
]);

function isTemplatePlaceholderLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (TEMPLATE_PLACEHOLDER_LINES.has(trimmed)) return true;
  if (/^##\s*제목\s*$/.test(trimmed)) return true;
  if (/작성(하세요|해\s*주세요|해주세요)\.?$/i.test(trimmed)) return true;
  if (/정리하세요\.?$/.test(trimmed)) return true;
  return false;
}

function collapseBlankLines(value: string) {
  return value.replace(/\n{3,}/g, "\n\n").trim();
}

function stripLeadingOrphanUrls(body: string, coverImage?: string) {
  const lines = body.split("\n");
  const filtered = [...lines];

  while (filtered.length > 0) {
    const trimmed = filtered[0]?.trim() ?? "";
    if (!trimmed) {
      filtered.shift();
      continue;
    }
    if (trimmed.startsWith("#")) break;
    if (isBareHttpUrl(trimmed) && (!coverImage || trimmed === coverImage)) {
      filtered.shift();
      continue;
    }
    break;
  }

  return filtered.join("\n");
}

export function stripFrontmatterArtifacts(body: string, coverImage?: string) {
  const lines = body.split("\n");
  const filtered: string[] = [];
  let skippingTagLine = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "---" || FRONTMATTER_FIELD_LINE.test(trimmed)) {
      skippingTagLine = trimmed === "tags:" || trimmed.endsWith("tags:");
      continue;
    }

    if (/coverImage:\s*\S+/.test(trimmed)) {
      continue;
    }

    if (isBareHttpUrl(trimmed) && (!coverImage || trimmed === coverImage)) {
      continue;
    }

    if (skippingTagLine) {
      skippingTagLine = false;
      if (
        trimmed &&
        (trimmed.startsWith("- ") ||
          (!trimmed.includes(":") && !trimmed.startsWith("#")))
      ) {
        continue;
      }
    }

    filtered.push(line);
  }

  return stripLeadingOrphanUrls(collapseBlankLines(filtered.join("\n")), coverImage);
}

export function stripTemplateBoilerplate(markdown: string) {
  const filtered = markdown
    .split("\n")
    .filter((line) => !isTemplatePlaceholderLine(line));

  return collapseBlankLines(filtered.join("\n"));
}
