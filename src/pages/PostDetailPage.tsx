import { Box, Container } from "@mui/material";
import PostMeta from "../components/Post/PostMeta";
import PostContent from "../components/Post/PostContent";
import PostComments from "../components/Post/PostComments";
import { dummyPostDetail } from "../data/dummyPosts";
import { useParams } from "react-router-dom";

export default function PostDetailPage() {
  const { id } = useParams();
  const post = dummyPostDetail[Number(id)];

  if (!post) {
    return <div>게시글을 찾을 수 없습니다.</div>;
  }

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
      {/* 썸네일 */}
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

      {/* 메타 정보 */}
      <PostMeta title={post.title} author={post.author} date={post.date} />

      {/* 본문 */}
      <PostContent html={post.html} />

      {/* 댓글 */}
      <PostComments postId={post.id} />
    </Container>
  );
}
