import { Stack } from "@mui/material";
import PostCard from "./PostCard";
import PostCardSkeleton from "./PostCardSkeleton";
import { useState, useEffect } from "react";
import { dummyPostList } from "../../data/dummyPosts";

export default function PostCardList() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Stack spacing={3}>
      {loading
        ? [...Array(3)].map((_, i) => <PostCardSkeleton key={i} />)
        : dummyPostList.map((post) => <PostCard key={post.id} {...post} />)}
    </Stack>
  );
}
