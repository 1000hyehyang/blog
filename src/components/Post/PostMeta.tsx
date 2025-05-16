// src/components/Post/PostMeta.tsx
import { Box, Typography, Stack, Chip } from "@mui/material";

interface PostMetaProps {
  title: string;
  author: string;
  date: string;
  tags?: string[];
}

export default function PostMeta({
  title,
  author,
  date,
  tags = [],
}: PostMetaProps) {
  return (
    <Box>
      <Typography
        variant="h4"
        fontWeight={700}
        sx={{ color: "var(--text-100)", mb: 2 }}
      >
        {title}
      </Typography>

      {tags.length > 0 && (
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          rowGap={1.2}
          mb={2}
        >
          {tags.map((tag, idx) => (
            <Chip
              key={idx}
              label={`#${tag}`}
              sx={{
                fontSize: "0.875rem",
                backgroundColor: "var(--bg-200)",
                color: "var(--text-300)",
                borderRadius: 2,
              }}
            />
          ))}
        </Stack>
      )}

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