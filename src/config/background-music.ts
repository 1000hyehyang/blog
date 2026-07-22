export const backgroundMusicConfig = {
  enabled: true,
  src: "/Memento%20mori.mp3",
  title: "Memento mori",
} as const;

export function getBackgroundMusicSrc() {
  if (!backgroundMusicConfig.enabled) return null;
  return backgroundMusicConfig.src;
}
