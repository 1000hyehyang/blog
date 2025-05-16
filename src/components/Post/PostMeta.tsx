// src/components/Post/PostMeta.tsx
import { Box, Typography, Stack } from "@mui/material";

interface PostMetaProps {
  title: string;
  author: string;
  date: string;
}

export default function PostMeta({ title, author, date }: PostMetaProps) {
  return (
    <Box>
      <Typography
        variant="h4"
        fontWeight={700}
        sx={{ color: "var(--text-100)", mb: 2 }}
      >
        {title}
      </Typography>

      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="caption" sx={{ color: "var(--text-300)" }}>
          {date}
        </Typography>
        <Typography variant="caption" sx={{ color: "var(--text-300)" }}>
          · {author}
        </Typography>
      </Stack>
    </Box>
  );
}
