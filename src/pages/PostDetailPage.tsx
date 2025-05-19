// src/pages/PostDetailPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Box, Container, Button } from "@mui/material";
import PostMeta from "../components/Post/PostMeta";
import PostContent from "../components/Post/PostContent";
import PostComments from "../components/Post/PostComments";
import ShareButtonGroup from "../components/common/ShareButtonGroup";
import LoadingPostDetail from "./LoadingPostDetail";
import type { PostComment } from "../types/comment";
import type { PostDetail } from "../types/post";
import { getPostDetail, getComments } from "../lib/api/postApi";
import { useAuthStore } from "../store/useAuthStore";

export default function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);

  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const loadPost = async () => {
      if (!id) return;
      setIsLoading(true);

      try {
        const postData = await getPostDetail(Number(id));
        const commentData = await getComments(Number(id));
        setPost(postData);
        setComments(commentData ?? []);
      } catch (err) {
        console.error("게시글 상세 조회 실패", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPost();
  }, [id]);

  const handleAddComment = (newComment: PostComment) => {
    setComments((prev) => [newComment, ...prev]);
  };

  if (isLoading || !post) return <LoadingPostDetail />;

  const isAuthor = user?.nickname === post.author;

  return (
    <Container
      maxWidth="md"
      sx={{
        py: { xs: 4, md: 6 },
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <Box
        component="img"
        src={post.thumbnailUrl}
        alt="썸네일"
        sx={{
          width: "100%",
          borderRadius: 2,
          objectFit: "cover",
        }}
      />

      {/* 콘텐츠 헤더 */}
      <PostMeta
        title={post.title}
        author={post.author}
        createdAt={post.createdAt}
        tags={post.tags}
      />

      {/* 콘텐츠 본문 */}
      <PostContent html={post.html} />

      {/* 공유 + 수정 */}
      <Box display="flex" justifyContent="flex-end" gap={1.5}>
        <ShareButtonGroup title={post.title} />
        {isAuthor && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate(`/post/${post.id}/edit`)}
            sx={{
              borderRadius: 2,
              color: "var(--text-400)",
              borderColor: "var(--bg-300)",
              fontWeight: 500,
              "&:hover": {
                borderColor: "var(--primary-100)",
                color: "var(--primary-100)",
              },
            }}
          >
            수정하기
          </Button>
        )}
      </Box>

      {/* 댓글 섹션 */}
      <PostComments comments={comments} onAddComment={handleAddComment} />
    </Container>
  );
}
