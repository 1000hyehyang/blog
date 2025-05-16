// src/components/Post/PostComments.tsx
import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  Stack,
  Divider,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import type { Comment } from "../../types/comment";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function PostComments({ postId }: { postId: number }) {
  const [comments, setComments] = useState<Comment[]>([
    {
      id: 1,
      content: "정말 좋은 글이에요! 잘 읽었습니다 😊",
      createdAt: "2시간 전",
      nickname: "익명1",
      emoji: "🐱",
    },
    {
      id: 2,
      content: "이런 주제 정말 좋아요. 감사합니다!",
      createdAt: "1일 전",
      nickname: "익명2",
      emoji: "🐧",
    },
  ]);
  const [input, setInput] = useState("");
  const [currentEmoji, setCurrentEmoji] = useState("🦊");

  const emojiPool = [
    "🐶",
    "🐱",
    "🦊",
    "🐻",
    "🐼",
    "🐨",
    "🐯",
    "🦁",
    "🐷",
    "🐸",
    "🐵",
  ];
  const getRandomEmoji = () =>
    emojiPool[Math.floor(Math.random() * emojiPool.length)];

  const handleSubmit = () => {
    if (!input.trim()) return;

    console.log(`📤 postId ${postId}에 댓글 작성:`, input);

    const emoji = getRandomEmoji();
    const newComment: Comment = {
      id: comments.length + 1,
      content: input.trim(),
      createdAt: "방금 전",
      nickname: `익명${comments.length + 1}`,
      emoji,
    };

    setComments([newComment, ...comments]);
    setInput("");
    setCurrentEmoji(getRandomEmoji()); // 입력창 아바타도 새로고침
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Box>
      <Typography
        variant="h6"
        fontWeight={600}
        mb={2}
        sx={{ color: "var(--text-100)" }}
      >
        💬 댓글 {comments.length}
      </Typography>

      {/* 댓글 입력 폼 */}
      <Stack direction="row" spacing={2} mb={3}>
        <Avatar sx={{ bgcolor: "var(--bg-200)", fontSize: 20 }}>
          {currentEmoji}
        </Avatar>
        <TextField
          fullWidth
          placeholder="댓글을 입력하세요"
          multiline
          minRows={1}
          maxRows={4}
          variant="standard" // ✅ 포인트: 밑줄형
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          sx={{
            "& .MuiInputBase-root": {
              backgroundColor: "transparent", // 기본 배경 투명
              px: 1,
            },
            "& .MuiInput-underline:before": {
              borderBottomColor: "var(--primary-50)", // 기본 선
            },
            "& .MuiInput-underline:hover:before": {
              borderBottomColor: "var(--primary-100)", // hover 시 색상
            },
            "& .MuiInput-underline:after": {
              borderBottomColor: "var(--primary-200)", // focus 시 강조선
            },
          }}
        />

        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!input.trim()}
          sx={{
            minWidth: 40,
            backgroundColor: "var(--primary-200)",
            "&:hover": {
              backgroundColor: "var(--primary-300)",
            },
          }}
        >
          <SendIcon />
        </Button>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* 댓글 리스트 */}
      <Stack spacing={2}>
        {comments.map((comment) => (
          <Box key={comment.id} display="flex" gap={2}>
            <Avatar sx={{ bgcolor: "var(--bg-200)", fontSize: 20 }}>
              {comment.emoji}
            </Avatar>
            <Box>
              <Typography
                variant="body2"
                sx={{ color: "var(--text-100)", fontWeight: 500 }}
              >
                {comment.nickname} · {comment.createdAt}
              </Typography>
              <Typography variant="body2" sx={{ color: "var(--text-200)" }}>
                {comment.content}
              </Typography>
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
