type DiscussionFormSplit = {
  raw: Record<string, unknown>;
  body: string;
};

function readSections(source: string) {
  const sections = new Map<string, string>();
  const headings = [...source.matchAll(/^###\s+(.+?)\s*$/gm)];

  headings.forEach((heading, index) => {
    const start = (heading.index ?? 0) + heading[0].length;
    const end = headings[index + 1]?.index ?? source.length;
    sections.set(heading[1], source.slice(start, end).trim());
  });

  return sections;
}

function response(value?: string) {
  const normalized = value?.trim();
  return !normalized || normalized === "_No response_" ? undefined : normalized;
}

function imageUrl(value?: string) {
  return response(value)?.match(/https?:\/\/[^\s)>]+/)?.[0];
}

export function splitDiscussionForm(
  source: string,
): DiscussionFormSplit | null {
  const bodyHeading = /^###\s+포스트 본문\s*$/m.exec(source);
  if (!bodyHeading) return null;

  const bodyStart = bodyHeading.index + bodyHeading[0].length;
  const settingsHeading = [
    ...source.slice(bodyStart).matchAll(/^###\s+대표 이미지\s*$/gm),
  ].at(-1);
  if (!settingsHeading) return null;

  const settingsStart = bodyStart + (settingsHeading.index ?? 0);
  const sections = readSections(source.slice(settingsStart));
  if (!sections.has("공개 상태")) return null;

  const body = source
    .slice(bodyStart, settingsStart)
    .replace(/\n+---\s*$/, "")
    .trim();
  if (!body) return null;

  const tags = response(sections.get("태그"))
    ?.split(/[\n,]/)
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean);

  return {
    raw: {
      coverImage: imageUrl(sections.get("대표 이미지")),
      galleryImage: imageUrl(sections.get("갤러리 이미지")),
      featured: response(sections.get("Featured")) === "예",
      featuredOrder: response(sections.get("Featured 순서")),
      published: response(sections.get("공개 상태")) === "공개",
      tags: tags ?? [],
    },
    body,
  };
}
