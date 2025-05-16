// src/pages/LoadingPostDetail.tsx
import { Container } from "@mui/material";
import PostThumbnailSkeleton from "../components/Post/PostThumbnailSkeleton";
import PostMetaSkeleton from "../components/Post/PostMetaSkeleton";
import PostContentSkeleton from "../components/Post/PostContentSkeleton";
import CommentFormSkeleton from "../components/Post/CommentFormSkeleton";
import CommentCardSkeleton from "../components/Post/CommentCardSkeleton";

export default function LoadingPostDetail() {
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
      <PostThumbnailSkeleton />
      <PostMetaSkeleton />
      <PostContentSkeleton />
      <CommentFormSkeleton />

      {[...Array(1)].map((_, i) => (
        <CommentCardSkeleton key={i} />
      ))}
    </Container>
  );
}
