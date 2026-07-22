export const siteConfig = {
  name: "1000hyehyang Dev Blog",
  shortName: "Dev Blog",
  title: "1000hyehyang, Dev Blog",
  description: "프론트엔드와 백엔드를 공부하고 기록합니다.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  author: { name: "1000hyehyang", role: "Software Developer" },
  navigation: [
    { label: "Development", category: "development" },
    { label: "Study", category: "study" },
    { label: "CS", category: "cs" },
    { label: "Art", category: "art" },
    { label: "Retrospective", category: "retrospective" },
    { label: "Essay", category: "essay" },
  ],
  socialLinks: {
    github: "https://github.com/1000hyehyang",
    email: "mailto:hello@example.com",
    portfolio: "/about",
    library: "/posts",
  },
  defaultImage: "/default-cover.svg",
} as const;

export type SiteNavigation = (typeof siteConfig.navigation)[number];
