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
