// src/components/Post/skeletons/PostThumbnailSkeleton.tsx
import { Skeleton } from "@mui/material";

export default function PostThumbnailSkeleton() {
  return (
    <Skeleton
      variant="rectangular"
      height={320}
      sx={{ width: "100%", borderRadius: 2 }}
    />
  );
}