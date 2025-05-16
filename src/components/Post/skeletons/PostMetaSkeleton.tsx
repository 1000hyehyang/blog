// src/components/Post/skeletons/PostMetaSkeleton.tsx
import { Box, Skeleton, Stack } from "@mui/material";

export default function PostMetaSkeleton() {
  return (
    <Box>
      <Skeleton variant="text" height={40} width="70%" sx={{ mb: 2 }} />

      <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            width={60 + i * 20}
            height={28}
            sx={{ borderRadius: 2 }}
          />
        ))}
      </Stack>

      <Stack direction="row" spacing={1}>
        <Skeleton variant="text" width={80} height={20} />
        <Skeleton variant="text" width={60} height={20} />
      </Stack>
    </Box>
  );
}