export function isBareHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function looksLikeFrontmatterFragment(value: string) {
  return /(?:slug|excerpt|coverImage|featured(?:Order)?|published|tags):/.test(
    value,
  );
}
