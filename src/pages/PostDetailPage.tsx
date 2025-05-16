import { useParams } from "react-router-dom";
import { useState } from "react";
import { Box, Container } from "@mui/material";
import PostMeta from "../components/Post/PostMeta";
import PostContent from "../components/Post/PostContent";
import PostComments from "../components/Post/PostComments";
import { dummyPostDetail } from "../data/dummyPosts";
import type { PostComment } from "../types/comment";

export default function PostDetailPage() {
  const { id } = useParams();
  const post = dummyPostDetail[Number(id)];

  const [comments, setComments] = useState<PostComment[]>(post?.comments ?? []);

  if (!post) {
    return <div>게시글을 찾을 수 없습니다.</div>;
  }

  const handleAddComment = (newComment: PostComment) => {
    setComments((prev) => [newComment, ...prev]);
    // API 연동 시 여기에 POST 요청 추가 예정
    // await api.post(`/posts/${post.id}/comments`, newComment);
  };

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
      <PostMeta
        title={post.title}
        author={post.author}
        date={post.date}
        tags={post.tags}
      />
      <PostContent html={post.html} />

      <PostComments comments={comments} onAddComment={handleAddComment} />
    </Container>
  );
}