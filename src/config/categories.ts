export type BlogSeries = {
  slug: string;
  label: string;
  description?: string;
};
export type BlogCategory = {
  category: string;
  label: string;
  tagline: string;
  series: readonly BlogSeries[];
};

export const categories: readonly BlogCategory[] = [
  {
    label: "Development",
    category: "development",
    tagline: "개발은 나의 동반자",
    series: [],
  },
  {
    label: "Study",
    category: "study",
    tagline: "공부는 죽을 때까지",
    series: [],
  },
  {
    label: "Art",
    category: "art",
    tagline: "일러스트와 블렌더. 2D도 하고 3D도 하고...",
    series: [],
  },
  {
    label: "Retrospective",
    category: "retrospective",
    tagline: "회고란 무엇인가",
    series: [],
  },
  {
    label: "Essay",
    category: "essay",
    tagline: "가볍게 끄적끄적",
    series: [{ slug: "life-updates", label: "여씨 근황" }],
  },
];
