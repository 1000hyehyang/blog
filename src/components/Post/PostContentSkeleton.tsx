// src/components/Post/PostContentSkeleton.tsx
import { Box, Skeleton } from "@mui/material";

export default function PostContentSkeleton() {
  return (
    <Box>
      <Skeleton variant="text" height={30} sx={{ mb: 1 }} />
      <Skeleton variant="text" height={30} width="90%" sx={{ mb: 1 }} />
      <Skeleton
        variant="rectangular"
        height={200}
        sx={{ borderRadius: 2, my: 3 }}
      />
      <Skeleton variant="text" height={28} width="60%" sx={{ mb: 1 }} />
      <Skeleton variant="text" height={28} width="80%" />
    </Box>
  );
}
