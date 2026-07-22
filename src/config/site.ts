export const siteConfig = {
  name: "1000hyehyang Dev Blog",
  shortName: "Dev Blog",
  title: "1000hyehyang's Dev Blog",
  description: "문제를 발견하고, 기술로 해결하며 얻은 경험을 기록합니다.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  author: { name: "1000hyehyang", role: "Software Developer" },
  navigation: [
    {
      label: "Development",
      category: "development",
      tagline: "개발은 나의 동반자",
    },
    {
      label: "Study",
      category: "study",
      tagline: "공부는 죽을 때까지",
    },
    {
      label: "CS",
      category: "cs",
      tagline: "얘야, 기초가 튼튼해야 더 멀리 갈 수 있단다...",
    },
    {
      label: "Art",
      category: "art",
      tagline: "3D 모델링은 나의 친구",
    },
    {
      label: "Retrospective",
      category: "retrospective",
      tagline: "회고란 무엇인가",
    },
    {
      label: "Essay",
      category: "essay",
      tagline: "가볍게 끄적끄적",
    },
  ],
  socialLinks: {
    github: "https://github.com/1000hyehyang",
    email: "mailto:hello@example.com",
    portfolio: "/about",
    library: "/posts",
  },
  defaultImage: "/og-default.png",
} as const;

export type SiteNavigation = (typeof siteConfig.navigation)[number];

export function getCategoryNavigation(category: string) {
  return siteConfig.navigation.find((item) => item.category === category);
}
