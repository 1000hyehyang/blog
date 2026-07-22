export const siteConfig = {
  name: "Chehyun Dev Blog",
  shortName: "Dev Blog",
  title: "Chehyun, Dev Blog",
  description: "프론트엔드와 백엔드를 공부하고 기록합니다.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  author: { name: "Chehyun", role: "Software Developer" },
  navigation: [
    { label: "Development", category: "development" },
    { label: "Study", category: "study" },
    { label: "Publish", category: "publish" },
    { label: "CS", category: "cs" },
    { label: "Vibe", category: "vibe" },
  ],
  socialLinks: {
    github: "https://github.com/",
    email: "mailto:hello@example.com",
    portfolio: "/about",
    library: "/posts",
  },
  defaultImage: "/default-cover.svg",
  profileMessage: "오늘도 한 걸음씩 성장하고 있습니다.",
} as const;

export type SiteNavigation = (typeof siteConfig.navigation)[number];
