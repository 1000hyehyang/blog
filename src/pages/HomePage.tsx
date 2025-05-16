import { useState } from "react";
import CategoryTabs from "../components/Home/CategoryTabs";
import PostCardList from "../components/Post/PostCardList";
import HeroBanner from "../components/Home/HeroBanner";

const categories = [
  "전체",
  "개발",
  "DevOps",
  "디자인",
  "프로젝트/회고",
  "기타",
];

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("전체");

  return (
    <>
      <HeroBanner />
      <CategoryTabs
        categories={categories}
        selectedCategory={selectedCategory}
        onChange={setSelectedCategory}
      />
      <PostCardList selectedCategory={selectedCategory} />
    </>
  );
}
