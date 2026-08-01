import { bundledLanguages, codeToHtml, type BundledLanguage } from "shiki";

const LANGUAGE_CLASS_PATTERN = /(?:^|\s)language-([^\s]+)(?:\s|$)/i;
const MAX_LANGUAGE_LABEL_LENGTH = 32;
const PLAIN_TEXT_LANGUAGES = new Set(["text", "txt", "plain", "plaintext"]);

export type MarkdownCodeLanguage = {
  label: string;
  shikiLanguage: BundledLanguage | null;
};

export function getMarkdownCodeLanguage(
  className?: string,
): MarkdownCodeLanguage | null {
  const label = LANGUAGE_CLASS_PATTERN.exec(className ?? "")?.[1]
    ?.toLowerCase()
    .slice(0, MAX_LANGUAGE_LABEL_LENGTH);

  if (!label) return null;

  const isBundledLanguage = Object.hasOwn(bundledLanguages, label);

  return {
    label,
    shikiLanguage:
      !PLAIN_TEXT_LANGUAGES.has(label) && isBundledLanguage
        ? (label as BundledLanguage)
        : null,
  };
}

export async function highlightMarkdownCode(
  code: string,
  language: MarkdownCodeLanguage | null,
): Promise<string | null> {
  if (!language?.shikiLanguage) return null;

  try {
    return await codeToHtml(code, {
      lang: language.shikiLanguage,
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    });
  } catch {
    return null;
  }
}
