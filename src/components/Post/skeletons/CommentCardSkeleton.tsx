// src/components/Post/skeletons/CommentCardSkeleton.tsx
import { Box, Skeleton, Stack } from "@mui/material";

export default function CommentCardSkeleton() {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1.5,
        px: 2,
        py: 2,
        bgcolor: "var(--bg-200)",
        borderRadius: 3,
      }}
    >
      {/* 아바타 */}
      <Skeleton variant="circular" width={40} height={40} />

      <Box flex={1}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={0.5}
        >
          <Skeleton variant="text" width={100} height={20} />
          <Skeleton variant="text" width={60} height={16} />
        </Stack>

        <Skeleton variant="text" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="text" height={20} width="80%" />
      </Box>
    </Box>
  );
}
