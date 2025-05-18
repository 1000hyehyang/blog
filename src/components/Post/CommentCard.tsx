// src/components/Post/CommentCard.tsx
import { Box, Stack, Avatar, Typography, Paper } from "@mui/material";
import type { PostComment } from "../../types/comment";

interface CommentCardProps {
  comment: PostComment;
}

export default function CommentCard({ comment }: CommentCardProps) {
  return (
    <Stack direction="row" spacing={2} alignItems="flex-start">
      {/* 아바타 */}
      <Avatar
        sx={{
          fontSize: 24,
          bgcolor: comment.bgColor,
          flexShrink: 0,
        }}
      >
        {comment.emoji}
      </Avatar>

      {/* 본문 */}
      <Box flex={1}>
        {/* 작성자 닉네임 + 작성일 */}
        <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
          <Typography variant="body2" fontWeight={600} sx={{ color: "var(--text-200)" }}>
            {comment.nickname}
          </Typography>
          <Typography variant="caption" sx={{ color: "var(--text-400)" }}>
            {comment.createdAt}
          </Typography>
        </Stack>

        {/* 댓글 내용 */}
        <Paper
          elevation={0}
          sx={{
            backgroundColor: "var(--bg-100)",
            p: 1.5,
            borderRadius: 2,
            border: "1px solid var(--bg-300)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          <Typography fontSize={14} sx={{ color: "var(--text-100)" }}>
            {comment.content}
          </Typography>
        </Paper>
      </Box>
    </Stack>
  );
}
