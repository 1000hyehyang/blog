import CategoryTabs from "../components/Home/CategoryTabs";
import PostCardList from "../components/Post/PostCardList";
import HeroBanner from "../components/Home/HeroBanner";

export default function HomePage() {
  return (
    <>
      <HeroBanner />
      <CategoryTabs />
      <PostCardList />
    </>
  );
}
