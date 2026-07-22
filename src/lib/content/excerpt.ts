import { isBareHttpUrl, looksLikeFrontmatterFragment } from "./text";

const DEFAULT_EXCERPT_LENGTH = 150;

export function createExcerpt(markdown: string, length = DEFAULT_EXCERPT_LENGTH) {
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

/** frontmatter의 excerpt가 URL이거나 파싱 잔여물이면 본문에서 요약을 생성한다. */
export function resolveExcerpt(
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
