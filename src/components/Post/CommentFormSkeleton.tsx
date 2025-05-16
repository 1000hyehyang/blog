// src/components/Post/CommentFormSkeleton.tsx
import { Box, Stack, Skeleton, Avatar, Paper } from "@mui/material";

export default function CommentFormSkeleton() {
  return (
    <Box>
      {/* 닉네임 + 버튼 */}
      <Stack direction="row" alignItems="center" spacing={2} mb={2}>
        <Skeleton variant="circular">
          <Avatar sx={{ width: 40, height: 40 }} />
        </Skeleton>
        <Skeleton
          variant="rectangular"
          width="100%"
          height={40}
          sx={{ borderRadius: 2 }}
        />
        <Skeleton
          variant="rectangular"
          width={80}
          height={36}
          sx={{ borderRadius: 2 }}
        />
      </Stack>

      {/* 입력창 */}
      <Paper
        elevation={0}
        sx={{
          border: "1px solid var(--bg-200)",
          borderRadius: 2,
          p: 2,
          backgroundColor: "var(--bg-100)",
          mb: 1,
        }}
      >
        <Skeleton variant="text" height={24} sx={{ mb: 1 }} />
      </Paper>

      {/* 안내 문구 */}
      <Skeleton variant="text" height={20} width="60%" sx={{ mb: 2 }} />

      {/* 버튼 */}
      <Box textAlign="right">
        <Skeleton
          variant="rectangular"
          width={120}
          height={36}
          sx={{ borderRadius: 2, display: "inline-block" }}
        />
      </Box>
    </Box>
  );
}
