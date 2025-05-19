// src/pages/DraftPostPage.tsx
import { useEffect, useState } from "react";
import { Stack, Typography, Container } from "@mui/material";
import PostCard from "../components/Post/PostCard";
import PostCardSkeleton from "../components/Post/skeletons/PostCardSkeleton";
import { getDraftPosts } from "../lib/api/postApi";
import type { PostSummary } from "../types/post";

export default function DraftPostPage() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostSummary[]>([]);

  useEffect(() => {
    const fetchDrafts = async () => {
      try {
        setLoading(true);
        const data = await getDraftPosts();
        setPosts(data);
      } catch (err) {
        alert("임시저장 글을 불러오지 못했습니다.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDrafts();
  }, []);

  return (
    <Container sx={{ py: 6 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        py={3}
      >
        <Typography variant="h4" color="var(--text-100)" fontWeight={700}>
          임시 저장 글
        </Typography>
      </Stack>

      <Stack spacing={3}>
        {loading ? (
          [...Array(3)].map((_, i) => <PostCardSkeleton key={i} />)
        ) : posts.length === 0 ? (
          <Typography variant="body1" color="var(--text-400)">
            아직 임시 저장된 글이 없습니다.
          </Typography>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              id={post.id}
              title={post.title}
              content={post.content}
              thumbnailUrl={post.thumbnailUrl}
              createdAt={post.createdAt}
              updatedAt={post.updatedAt}
            />
          ))
        )}
      </Stack>
    </Container>
  );
}
