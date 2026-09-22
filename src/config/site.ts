const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

export const siteConfig = {
  name: "1000hyehyang Blog",
  shortName: "Blog",
  title: "1000hyehyang's Blog",
  description: "배우고, 만들고, 살아가며 남기는 기록",
  url: siteUrl,
  author: { name: "1000hyehyang" },
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
      tagline: "일러스트와 블렌더. 2D도 하고 3D도 하고...",
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
    email: "ducogus12@gmail.com",
    portfolio: "https://www.1000hyehyang.me/",
  },
  defaultImage: "/og-blog.png",
} as const;

export function getCategoryNavigation(category: string) {
  return siteConfig.navigation.find((item) => item.category === category);
}
