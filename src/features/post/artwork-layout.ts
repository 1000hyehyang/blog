const FALLBACK_ARTWORK_ASPECT_RATIO = 4 / 5;

export function resolveArtworkAspectRatio(width?: number, height?: number) {
  if (!width || !height) return FALLBACK_ARTWORK_ASPECT_RATIO;

  return width / height;
}
