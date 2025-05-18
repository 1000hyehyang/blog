import { Box, Typography, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { formatDate } from "../../lib/utils/formatDate";

interface PostCardProps {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string;
}

export default function PostCard({
  id,
  title,
  content,
  createdAt,
  thumbnailUrl,
}: PostCardProps) {
  const navigate = useNavigate();
  const formattedDate = formatDate(createdAt); 

  return (
    <Paper
      elevation={0}
      onClick={() => navigate(`/post/${id}`)}
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between",
        alignItems: "stretch",
        gap: 3,
        p: 3,
        border: "none",
        borderRadius: 4,
        backgroundColor: "var(--bg-100)",
        cursor: "pointer",
        transition: "all 0.2s ease",
        "&:hover": {
          backgroundColor: "var(--bg-200)",
        },
      }}
    >
      {/* 썸네일: 모바일은 위, 데스크탑은 오른쪽 */}
      {thumbnailUrl && (
        <Box
          component="img"
          src={thumbnailUrl}
          alt={title}
          sx={{
            width: { xs: "100%", sm: 160 },
            height: { xs: 180, sm: 100 },
            borderRadius: 2,
            objectFit: "cover",
            flexShrink: 0,
            order: { xs: 0, sm: 1 },
          }}
        />
      )}

      {/* 텍스트 */}
      <Box flex={1}>
        <Typography
          variant="h6"
          fontWeight={700}
          sx={{ color: "var(--text-100)" }}
          gutterBottom
        >
          {title}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: "var(--text-200)",
            mb: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {content}
        </Typography>

        <Typography variant="caption" sx={{ color: "var(--text-300)" }}>
          {formattedDate}
        </Typography>
      </Box>
    </Paper>
  );
}
