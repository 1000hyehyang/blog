// src/components/Post/PostCardSkeleton.tsx
import { Box, Skeleton, Paper } from "@mui/material";

export default function PostCardSkeleton() {
  return (
    <Paper
      elevation={0}
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between",
        alignItems: "stretch",
        gap: 3,
        p: 3,
        border: "none",
        borderRadius: 2,
        backgroundColor: "var(--bg-100)",
      }}
    >
      {/* 썸네일 영역 */}
      <Box
        sx={{
          width: { xs: "100%", sm: 160 },
          height: { xs: 180, sm: 100 },
          borderRadius: 2,
          flexShrink: 0,
          order: { xs: 0, sm: 1 },
        }}
      >
        <Skeleton
          variant="rectangular"
          width="100%"
          height="100%"
          sx={{ borderRadius: 2 }}
        />
      </Box>

      {/* 텍스트 영역 */}
      <Box flex={1}>
        <Skeleton variant="text" width="80%" height={28} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="100%" height={20} />
        <Skeleton variant="text" width="90%" height={20} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="30%" height={16} />
      </Box>
    </Paper>
  );
}
