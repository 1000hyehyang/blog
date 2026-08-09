import { isBareHttpUrl, isFrontmatterFieldLine } from "./text";

/** 손상된 frontmatter를 복구한 뒤 본문에 남은 메타데이터 조각을 제거한다. */

function collapseBlankLines(value: string) {
  return value.replace(/\n{3,}/g, "\n\n").trim();
}

function stripLeadingOrphanUrls(body: string, imageSources: string[]) {
  const lines = body.split("\n");
  const filtered = [...lines];

  while (filtered.length > 0) {
    const trimmed = filtered[0]?.trim() ?? "";
    if (!trimmed) {
      filtered.shift();
      continue;
    }
    if (trimmed.startsWith("#")) break;
    if (isBareHttpUrl(trimmed) && imageSources.includes(trimmed)) {
      filtered.shift();
      continue;
    }
    break;
  }

  return filtered.join("\n");
}

export function stripFrontmatterArtifacts(
  body: string,
  imageSources: string[] = [],
) {
  const lines = body.split("\n");
  const filtered: string[] = [];
  let skippingTagLine = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (isFrontmatterFieldLine(trimmed)) {
      skippingTagLine = trimmed === "tags:" || trimmed.endsWith("tags:");
      continue;
    }

    if (/(?:coverImage|galleryImage):\s*\S+/.test(trimmed)) {
      continue;
    }

    if (isBareHttpUrl(trimmed) && imageSources.includes(trimmed)) {
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

  return stripLeadingOrphanUrls(
    collapseBlankLines(filtered.join("\n")),
    imageSources,
  );
}
