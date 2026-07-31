const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const BLOCKED_HOST_SUFFIXES = [
  ".internal",
  ".lan",
  ".local",
  ".localhost",
] as const;

export type LinkPreviewMetadata = {
  title?: string;
  description?: string;
  image?: string;
  icon?: string;
  siteName?: string;
};

type HtmlAttributes = Record<string, string>;

function normalizeHostname(hostname: string): string {
  return hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
}

export function isBlockedHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);

  return (
    normalized === "localhost" ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => normalized.endsWith(suffix))
  );
}

function isNonPublicIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return true;
  }

  const [first, second] = octets;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 168) ||
    (first === 192 && second === 0 && octets[2] === 2) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && octets[2] === 100) ||
    (first === 203 && second === 0 && octets[2] === 113) ||
    first >= 224
  );
}

function isNonPublicIpv6(address: string): boolean {
  const normalized = normalizeHostname(address).split("%")[0];

  if (
    normalized.startsWith("::") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89a-f]/.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized === "2001:db8" ||
    normalized.startsWith("2001:db8:")
  ) {
    return true;
  }

  return false;
}

export function isNonPublicIpAddress(address: string): boolean {
  const normalized = normalizeHostname(address);
  return normalized.includes(":")
    ? isNonPublicIpv6(normalized)
    : isNonPublicIpv4(normalized);
}

export function parseExternalHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);

    if (
      !ALLOWED_PROTOCOLS.has(url.protocol) ||
      (url.port !== "" &&
        !(
          (url.protocol === "http:" && url.port === "80") ||
          (url.protocol === "https:" && url.port === "443")
        )) ||
      url.username ||
      url.password ||
      isBlockedHostname(url.hostname)
    ) {
      return null;
    }

    const hostname = normalizeHostname(url.hostname);
    if (/^[\d.]+$/.test(hostname) && isNonPublicIpAddress(hostname)) {
      return null;
    }
    if (hostname.includes(":") && isNonPublicIpAddress(hostname)) return null;

    return url;
  } catch {
    return null;
  }
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(
    /&(?:#(\d+)|#x([\da-f]+)|([a-z][\da-z]+));/gi,
    (entity, decimal: string, hexadecimal: string, named: string) => {
      if (decimal) return String.fromCodePoint(Number(decimal));
      if (hexadecimal)
        return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
      return namedEntities[named.toLowerCase()] ?? entity;
    },
  );
}

function normalizeMetadataText(value: string, maxLength: number): string {
  const normalized = decodeHtmlEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized.slice(0, maxLength);
}

function parseAttributes(tag: string): HtmlAttributes {
  const attributes: HtmlAttributes = {};
  const pattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

  for (const match of tag.matchAll(pattern)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }

  return attributes;
}

function findMetaContent(html: string, names: string[]): string | undefined {
  const wantedNames = new Set(names.map((name) => name.toLowerCase()));

  for (const tag of html.match(/<meta\s+[^>]*>/gi) ?? []) {
    const attributes = parseAttributes(tag);
    const name = (attributes.property ?? attributes.name ?? "").toLowerCase();
    if (wantedNames.has(name) && attributes.content) return attributes.content;
  }

  return undefined;
}

function findDocumentTitle(html: string): string | undefined {
  return html.match(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i)?.[1];
}

function resolveAssetUrl(
  value: string | undefined,
  pageUrl: URL,
): string | undefined {
  if (!value) return undefined;

  try {
    const resolved = new URL(decodeHtmlEntities(value), pageUrl);
    return parseExternalHttpUrl(resolved.href)?.href;
  } catch {
    return undefined;
  }
}

function findIcon(html: string, pageUrl: URL): string | undefined {
  for (const tag of html.match(/<link\s+[^>]*>/gi) ?? []) {
    const attributes = parseAttributes(tag);
    const relations = (attributes.rel ?? "").toLowerCase().split(/\s+/);

    if (relations.includes("icon")) {
      return resolveAssetUrl(attributes.href, pageUrl);
    }
  }

  return undefined;
}

export function parseLinkPreviewHtml(
  html: string,
  pageUrl: URL,
): LinkPreviewMetadata {
  const rawTitle =
    findMetaContent(html, ["og:title", "twitter:title"]) ??
    findDocumentTitle(html);
  const rawDescription = findMetaContent(html, [
    "og:description",
    "twitter:description",
    "description",
  ]);
  const title = rawTitle ? normalizeMetadataText(rawTitle, 160) : "";
  const description = rawDescription
    ? normalizeMetadataText(rawDescription, 280)
    : "";
  const rawSiteName = findMetaContent(html, ["og:site_name"]);
  const siteName = rawSiteName ? normalizeMetadataText(rawSiteName, 80) : "";

  return {
    title: title || undefined,
    description: description || undefined,
    image: resolveAssetUrl(
      findMetaContent(html, [
        "og:image:secure_url",
        "og:image",
        "twitter:image",
      ]),
      pageUrl,
    ),
    icon: findIcon(html, pageUrl),
    siteName: siteName || undefined,
  };
}
