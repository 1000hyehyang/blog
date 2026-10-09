export const MAX_IMAGE_UPLOAD_BYTES = 20 * 1024 * 1024;
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
  {
    protocol: "https" as const,
    hostname: "*.public.blob.vercel-storage.com",
    pathname: "/posts/**",
  },
];

export function canOptimizeImage(src: string) {
  if (/^\/(?!\/)/.test(src)) return true;

  try {
    const url = new URL(src);
    return remoteImagePatterns.some(
      ({ protocol, hostname, pathname }) =>
        url.protocol === `${protocol}:` &&
        !url.port &&
        (hostname.startsWith("*.")
          ? url.hostname.slice(url.hostname.indexOf(".")) === hostname.slice(1)
          : url.hostname === hostname) &&
        (pathname === "/**" || url.pathname.startsWith(pathname.slice(0, -2))),
    );
  } catch {
    return false;
  }
}
