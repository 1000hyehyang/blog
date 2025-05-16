// src/pages/LoadingPostDetail.tsx
import { Container } from "@mui/material";
import PostThumbnailSkeleton from "../components/Post/skeletons/PostThumbnailSkeleton";
import PostMetaSkeleton from "../components/Post/skeletons/PostMetaSkeleton";
import PostContentSkeleton from "../components/Post/skeletons/PostContentSkeleton";
import CommentFormSkeleton from "../components/Post/skeletons/CommentFormSkeleton";
import CommentCardSkeleton from "../components/Post/skeletons/CommentCardSkeleton";

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
