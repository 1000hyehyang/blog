import { Avatar, Box, Typography } from "@mui/material";
import type { PostComment } from "../../types/comment";

interface CommentCardProps {
  comment: PostComment;
}

export default function CommentCard({ comment }: CommentCardProps) {
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
      <Avatar
        sx={{
          fontSize: 24,
          width: 40,
          height: 40,
          bgcolor: comment.bgColor || "var(--bg-200)",
        }}
      >
        {comment.emoji}
      </Avatar>

      <Box flex={1}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={0.5}
        >
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: "var(--text-100)" }}
          >
            {comment.nickname}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "var(--text-300)", fontSize: 12 }}
          >
            {comment.createdAt}
          </Typography>
        </Box>

        <Typography
          variant="body2"
          sx={{ color: "var(--text-200)", fontSize: 14 }}
        >
          {comment.content}
        </Typography>
      </Box>
    </Box>
  );
}
