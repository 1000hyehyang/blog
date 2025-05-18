// src/components/Post/PostCardList.tsx
import { useEffect, useState } from "react";
import { Stack } from "@mui/material";
import PostCard from "./PostCard";
import PostCardSkeleton from "./skeletons/PostCardSkeleton";
import { getRecentPosts } from "../../lib/api/postApi";
import type { PostSummary } from "../../types/post";

interface PostCardListProps {
  selectedCategory: string;
}

export default function PostCardList({ selectedCategory }: PostCardListProps) {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostSummary[]>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const data = await getRecentPosts();
        setPosts(data);
      } catch (err) {
        console.error("게시글 목록 조회 실패", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const filteredPosts =
    selectedCategory === "전체"
      ? posts
      : posts.filter((post) => post.category === selectedCategory);

  return (
    <Stack spacing={3}>
      {loading
        ? [...Array(3)].map((_, i) => <PostCardSkeleton key={i} />)
        : filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              id={post.id}
              title={post.title}
              content={post.content}
              thumbnailUrl={post.thumbnailUrl}
              createdAt={post.createdAt}
              updatedAt={post.updatedAt}
            />
          ))}
    </Stack>
  );
}
