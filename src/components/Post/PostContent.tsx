// src/components/Post/PostContent.tsx
import { Box, Typography } from "@mui/material";
import DOMPurify from "dompurify";

interface PostContentProps {
  html: string;
}

export default function PostContent({ html }: PostContentProps) {
  if (!html || !html.trim()) {
    return (
      <Typography sx={{ color: "var(--text-400)", fontStyle: "italic" }}>
        아직 본문이 작성되지 않았습니다.
      </Typography>
    );
  }

  const sanitizedHtml = DOMPurify.sanitize(html); // 🔐 XSS 방어

  return (
    <Box
      sx={{
        color: "var(--text-200)",
        fontSize: "1rem",
        lineHeight: 1.8,
        wordBreak: "break-word",

        "& h1, & h2, & h3": {
          color: "var(--text-100)",
          fontWeight: 700,
          mt: 4,
          mb: 2,
        },
        "& p": {
          mb: 2,
        },
        "& ul, & ol": {
          pl: 3,
          mb: 2,
        },
        "& li": {
          mb: 1,
        },
        "& blockquote": {
          borderLeft: "4px solid var(--primary-100)",
          backgroundColor: "var(--bg-200)",
          px: 2,
          py: 1,
          fontStyle: "italic",
          color: "var(--text-300)",
          mb: 2,
        },
        "& code": {
          fontSize: "0.9rem",
          backgroundColor: "var(--bg-300)",
          borderRadius: 4,
          px: 1,
          py: 0.25,
          color: "var(--text-100)",
          fontFamily: "Menlo, Monaco, Consolas, 'Courier New', monospace",
        },
        "& pre": {
          backgroundColor: "var(--bg-300)",
          padding: 2,
          borderRadius: 2,
          overflowX: "auto",
          mb: 2,
        },
        "& img": {
          maxWidth: "100%",
          borderRadius: 8,
          my: 3,
        },
        "& a": {
          color: "var(--primary-200)",
          textDecoration: "underline",
        },
      }}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
