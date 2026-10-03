import { categories } from "./categories";

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
  navigation: categories,
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
