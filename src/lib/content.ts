import matter from "gray-matter";
import { z } from "zod";

const metadataSchema = z.object({
  slug: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  excerpt: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  coverImage: z.preprocess(
    emptyToUndefined,
    z.string().url().optional(),
  ),
  featured: z.preprocess(coerceBoolean, z.boolean().default(false)),
  featuredOrder: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().nonnegative().optional(),
  ),
  published: z.preprocess(
    (value) => (value === undefined ? true : coerceBoolean(value)),
    z.boolean().default(true),
  ),
  tags: z.array(z.string()).default([]),
});

const FRONTMATTER_FIELD_LINE =
  /^(?:---|slug:|excerpt:|coverImage:|featured:|featuredOrder:|published:|tags:)/;

function emptyToUndefined(value: unknown) {
  if (value === "" || value === null) return undefined;
  return value;
}

function coerceBoolean(value: unknown) {
  if (value === true || value === "true" || value === "True") return true;
  if (value === false || value === "false" || value === "False") return false;
  return value;
}

function mergeMetadata(raw: Record<string, unknown>) {
  const result = metadataSchema.safeParse(raw);
  if (result.success) return result.data;

  const fallback = metadataSchema.parse({});
  const partial = metadataSchema.safeParse({
    ...fallback,
    featured: raw.featured ?? fallback.featured,
    featuredOrder: raw.featuredOrder ?? fallback.featuredOrder,
    published: raw.published ?? fallback.published,
    slug: emptyToUndefined(raw.slug),
    excerpt: emptyToUndefined(raw.excerpt),
    coverImage: emptyToUndefined(raw.coverImage),
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((tag): tag is string => typeof tag === "string")
      : fallback.tags,
  });

  return partial.success ? partial.data : fallback;
}

export type PostMetadata = z.infer<typeof metadataSchema>;

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

function normalizeDiscussionSource(source: string) {
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

function extractMetadataFromRawText(text: string): Record<string, unknown> {
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
    .match(/slug:\s*([^\n]+?)(?=\s*excerpt:|\s*coverImage:|\s*featured:|\s*$)/)?.[1]
    ?.trim();
  if (slug) raw.slug = slug;

  const excerpt = text
    .match(/excerpt:\s*([^\n]+?)(?=\s*coverImage:|\s*featured:|\s*$)/)?.[1]
    ?.trim();
  if (excerpt && !isBareHttpUrl(excerpt) && !looksLikeFrontmatterFragment(excerpt)) {
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

function splitFrontmatterBlock(source: string) {
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

function splitMangledFrontmatter(source: string) {
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
        (!nextLine.includes(":") &&
          frontmatterLines[0]?.includes("tags:")));

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

function isBareHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function looksLikeFrontmatterFragment(value: string) {
  return /(?:slug|excerpt|coverImage|featured(?:Order)?|published|tags):/.test(
    value,
  );
}

function resolveExcerpt(
  value: string | undefined,
  body: string,
  coverImage: string,
) {
  const candidate = value?.trim();
  if (
    candidate &&
    !isBareHttpUrl(candidate) &&
    candidate !== coverImage &&
    !looksLikeFrontmatterFragment(candidate)
  ) {
    return candidate;
  }

  return createExcerpt(body);
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

function stripFrontmatterArtifacts(body: string, coverImage?: string) {
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

  return stripLeadingOrphanUrls(
    filtered.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
    coverImage,
  );
}

export function stripTemplateBoilerplate(markdown: string) {
  const filtered = markdown
    .split("\n")
    .filter((line) => !isTemplatePlaceholderLine(line));

  return filtered.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function resolveCoverImage(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  try {
    if (trimmed.startsWith("/")) return trimmed;
    new URL(trimmed);
    return trimmed;
  } catch {
    return "";
  }
}

export function createExcerpt(markdown: string, length = 150) {
  const plainText = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#>*_`~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plainText.length > length
    ? `${plainText.slice(0, length).trim()}…`
    : plainText;
}

export function parsePostBody(source: string) {
  const normalizedSource = normalizeDiscussionSource(source);
  const { raw, body: rawBody } = splitFrontmatterBlock(normalizedSource);
  const metadata = mergeMetadata(raw);
  const coverImage = resolveCoverImage(metadata.coverImage);
  const body = stripTemplateBoilerplate(
    stripFrontmatterArtifacts(rawBody.trim(), coverImage),
  );
  const valid = metadataSchema.safeParse(raw).success;

  return {
    body,
    metadata: {
      ...metadata,
      excerpt: resolveExcerpt(metadata.excerpt, body, coverImage),
      coverImage,
    },
    valid,
  };
}

export function toSlug(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-|-$/g, "");
}

export function formatDate(value: string, locale = "ko-KR") {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
