export const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024;
export const IMAGE_UPLOAD_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
};
export const IMAGE_UPLOAD_TYPES = Object.keys(IMAGE_UPLOAD_EXTENSIONS);

export const remoteImagePatterns = [
  {
    protocol: "https" as const,
    hostname: "images.unsplash.com",
    pathname: "/**",
  },
  {
    protocol: "https" as const,
    hostname: "github.com",
    pathname: "/user-attachments/**",
  },
];

export function canOptimizeImage(src: string) {
  if (src.startsWith("/")) return true;

  try {
    const url = new URL(src);
    return remoteImagePatterns.some(
      ({ protocol, hostname, pathname }) =>
        url.protocol === `${protocol}:` &&
        url.hostname === hostname &&
        (pathname === "/**" || url.pathname.startsWith(pathname.slice(0, -2))),
    );
  } catch {
    return false;
  }
}
