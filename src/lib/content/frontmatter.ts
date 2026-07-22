import matter from "gray-matter";

import { isBareHttpUrl, looksLikeFrontmatterFragment } from "./text";

/**
 * GitHub Discussion 본문은 Discussion form 헤더, 줄바꿈이 깨진 frontmatter 등
 * 정상적인 YAML frontmatter가 아닌 형태로 저장될 수 있다.
 * 이 모듈은 그런 원본에서 frontmatter 블록과 본문을 분리한다.
 */

export type FrontmatterSplit = {
  raw: Record<string, unknown>;
  body: string;
};

/** Discussion form 헤더 등 frontmatter 이전의 내용을 제거한다. */
export function normalizeDiscussionSource(source: string) {
  const lines = source.split("\n");
  const frontmatterIndex = lines.findIndex((line) => line.trim() === "---");
  if (frontmatterIndex > 0) {
    return lines.slice(frontmatterIndex).join("\n");
  }
  return source;
}

function looksLikeFrontmatterLine(line: string) {
  const trimmed = line.trim();
  return (
    trimmed === "---" ||
    trimmed.startsWith("slug:") ||
    /coverImage:\s*\S+/.test(trimmed) ||
    /featured:\s*(true|false)/i.test(trimmed)
  );
}

/** 줄바꿈이 깨져 한 줄로 합쳐진 frontmatter 텍스트에서 필드 값을 추출한다. */
export function extractMetadataFromRawText(
  text: string,
): Record<string, unknown> {
  const raw: Record<string, unknown> = {};

  const coverImage = text.match(/coverImage:\s*(\S+)/)?.[1];
  if (coverImage) raw.coverImage = coverImage;

  const featured = text.match(/featured:\s*(true|false)/i)?.[1];
  if (featured) raw.featured = featured;

  const featuredOrder = text.match(/featuredOrder:\s*(\d+)/)?.[1];
  if (featuredOrder) raw.featuredOrder = Number(featuredOrder);

  const published = text.match(/published:\s*(true|false)/i)?.[1];
  if (published) raw.published = published;

  const slug = text
    .match(
      /slug:\s*([^\n]+?)(?=\s*excerpt:|\s*coverImage:|\s*featured:|\s*$)/,
    )?.[1]
    ?.trim();
  if (slug) raw.slug = slug;

  const excerpt = text
    .match(/excerpt:\s*([^\n]+?)(?=\s*coverImage:|\s*featured:|\s*$)/)?.[1]
    ?.trim();
  if (
    excerpt &&
    !isBareHttpUrl(excerpt) &&
    !looksLikeFrontmatterFragment(excerpt)
  ) {
    raw.excerpt = excerpt;
  }

  const inlineTags = text.match(/tags:\s*(.+)$/m)?.[1]?.trim();
  if (inlineTags && inlineTags !== "" && !inlineTags.startsWith("[")) {
    raw.tags = inlineTags
      .split(",")
      .map((tag) => tag.replace(/^-\s*/, "").trim())
      .filter(Boolean);
  }

  const listTags = [...text.matchAll(/^\s*-\s+(.+)$/gm)].map((match) =>
    match[1].trim(),
  );
  if (listTags.length) raw.tags = listTags;

  if (!raw.tags) {
    const standaloneTag = text
      .split("\n")
      .map((line) => line.trim())
      .find(
        (line) =>
          line &&
          !line.startsWith("#") &&
          !line.includes(":") &&
          !line.startsWith("-"),
      );
    if (standaloneTag) raw.tags = [standaloneTag];
  }

  return raw;
}

export function splitFrontmatterBlock(source: string): FrontmatterSplit {
  const fenced = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (fenced) {
    try {
      const parsed = matter(`---\n${fenced[1]}\n---\n`);
      return {
        raw: {
          ...extractMetadataFromRawText(fenced[1]),
          ...(parsed.data as Record<string, unknown>),
        },
        body: fenced[2],
      };
    } catch {
      return splitMangledFrontmatter(source);
    }
  }

  if (looksLikeFrontmatterLine(source.split("\n")[0] ?? "")) {
    return splitMangledFrontmatter(source);
  }

  try {
    const parsed = matter(source);
    if (looksLikeFrontmatterLine(parsed.content.split("\n")[0] ?? "")) {
      return splitMangledFrontmatter(source);
    }

    return {
      raw: parsed.data as Record<string, unknown>,
      body: parsed.content,
    };
  } catch {
    return splitMangledFrontmatter(source);
  }
}

function splitMangledFrontmatter(source: string): FrontmatterSplit {
  const lines = source.split("\n");
  const frontmatterLines: string[] = [];
  let bodyStart = 0;

  if (lines[0]?.trim() === "---") {
    for (let i = 0; i < lines.length; i += 1) {
      frontmatterLines.push(lines[i]);
      bodyStart = i + 1;
      if (i > 0 && lines[i]?.trim() === "---") break;
    }
  } else if (looksLikeFrontmatterLine(lines[0] ?? "")) {
    frontmatterLines.push(lines[0]);
    bodyStart = 1;

    let index = 1;
    while (index < lines.length && lines[index]?.trim() === "") {
      index += 1;
    }

    const nextLine = lines[index]?.trim() ?? "";
    const tagsOnlyLine =
      nextLine &&
      !nextLine.startsWith("#") &&
      (nextLine.startsWith("- ") ||
        (!nextLine.includes(":") && frontmatterLines[0]?.includes("tags:")));

    if (tagsOnlyLine) {
      frontmatterLines.push(lines[index]);
      bodyStart = index + 1;
    }
  }

  const frontmatterText = frontmatterLines.join("\n");

  return {
    raw: extractMetadataFromRawText(frontmatterText),
    body: lines.slice(bodyStart).join("\n"),
  };
}
