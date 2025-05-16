import { Stack } from "@mui/material";
import PostCard from "./PostCard";
import PostCardSkeleton from "./skeletons/PostCardSkeleton";
import { useState, useEffect } from "react";
import { dummyPostList } from "../../data/dummyPosts";

interface PostCardListProps {
  selectedCategory: string;
}

export default function PostCardList({ selectedCategory }: PostCardListProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const filteredPosts =
    selectedCategory === "전체"
      ? dummyPostList
      : dummyPostList.filter((post) => post.category === selectedCategory);

  return (
    <Stack spacing={3}>
      {loading
        ? [...Array(3)].map((_, i) => <PostCardSkeleton key={i} />)
        : filteredPosts.map((post) => <PostCard key={post.id} {...post} />)}
    </Stack>
  );
}
