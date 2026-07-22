import { isBareHttpUrl } from "./text";

/**
 * frontmatter 파싱 후 본문에 남은 잔여물(frontmatter 라인, 대표 이미지 URL 등)을
 * 제거해 렌더링 가능한 본문만 남긴다.
 */

const FRONTMATTER_FIELD_LINE =
  /^(?:---|slug:|excerpt:|coverImage:|featured:|featuredOrder:|published:|tags:)/;

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
