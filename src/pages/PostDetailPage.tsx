import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Box, Container } from "@mui/material";
import PostMeta from "../components/Post/PostMeta";
import PostContent from "../components/Post/PostContent";
import PostComments from "../components/Post/PostComments";
import ShareButtonGroup from "../components/common/ShareButtonGroup";
import { dummyPostDetail } from "../data/dummyPosts";
import type { PostComment } from "../types/comment";
import LoadingPostDetail from "./LoadingPostDetail";

export default function PostDetailPage() {
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [post, setPost] = useState<(typeof dummyPostDetail)[1] | null>(null);

  useEffect(() => {
    // 더미 기준이므로 비동기 simulate
    const loadPost = async () => {
      setIsLoading(true);
      await new Promise((r) => setTimeout(r, 1000)); // 1초 지연 시뮬레이션
      const fetchedPost = dummyPostDetail[Number(id)];
      setPost(fetchedPost);
      setComments(fetchedPost?.comments ?? []);
      setIsLoading(false);
    };

    loadPost();
  }, [id]);

  const handleAddComment = (newComment: PostComment) => {
    setComments((prev) => [newComment, ...prev]);
    // API 연동 시 POST 요청 추가
  };

  if (isLoading || !post) return <LoadingPostDetail />;

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
          maxHeight: 320,
          borderRadius: 2,
          objectFit: "cover",
        }}
      />

      {/* 콘텐츠 헤더 */}
      <PostMeta
        title={post.title}
        author={post.author}
        date={post.date}
        tags={post.tags}
      />

      {/* 콘텐츠 본문 */}
      <PostContent html={post.html} />

      {/* 콘텐츠 공유 버튼 */}
      <Box display="flex" justifyContent="flex-end">
        <ShareButtonGroup title={post.title} />
      </Box>

      {/* 댓글 */}
      <PostComments comments={comments} onAddComment={handleAddComment} />
    </Container>
  );
}
