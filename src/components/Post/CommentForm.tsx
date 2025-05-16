// src/components/Post/CommentForm.tsx
import { useState } from "react";
import {
  Box,
  Stack,
  Avatar,
  InputBase,
  Button,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import type { PostComment } from "../../types/comment";

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

const avatarBgColors = [
  "#FFE0E0",
  "#FFF2CC",
  "#E0FFD1",
  "#D1E0FF",
  "#F3D1FF",
  "#E6F3FF",
  "#FFD8B1",
  "#E0F7FA",
];

const MAX_NICKNAME_LENGTH = 20;
const MAX_COMMENT_LENGTH = 200;

interface CommentFormProps {
  onSubmit: (comment: PostComment) => void;
}

export default function CommentForm({ onSubmit }: CommentFormProps) {
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState("");
  const [nickname, setNickname] = useState("익명의 댓글");
  const [currentEmoji, setCurrentEmoji] = useState("🦊");
  const [currentAvatarBg, setCurrentAvatarBg] = useState(avatarBgColors[0]);

  const getRandomAvatar = () => {
    const emoji = emojiPool[Math.floor(Math.random() * emojiPool.length)];
    const bgColor =
      avatarBgColors[Math.floor(Math.random() * avatarBgColors.length)];
    return { emoji, bgColor };
  };

  const handleRandomize = () => {
    const { emoji, bgColor } = getRandomAvatar();
    setCurrentEmoji(emoji);
    setCurrentAvatarBg(bgColor);
  };

  const handleSubmit = () => {
    if (!input.trim()) return;
    const newComment: PostComment = {
      id: Date.now(),
      content: input.trim(),
      createdAt: "방금 전",
      nickname,
      emoji: currentEmoji,
      bgColor: currentAvatarBg,
    };
    onSubmit(newComment);
    setInput("");
    setInputError("");
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} mb={2}>
        <Avatar sx={{ fontSize: 24, bgcolor: currentAvatarBg }}>
          {currentEmoji}
        </Avatar>
        <InputBase
          value={nickname}
          onChange={(e) => {
            const value = e.target.value;
            if (value.length <= MAX_NICKNAME_LENGTH) {
              setNickname(value);
            }
          }}
          sx={{
            px: 1.5,
            py: 0.5,
            border: "1px solid var(--bg-300)",
            borderRadius: 2,
            flex: 1,
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text-200)",
            backgroundColor: "var(--bg-100)",
          }}
        />
        <Button
          onClick={handleRandomize}
          variant="outlined"
          sx={{
            borderRadius: 2,
            fontSize: 13,
            height: 36,
            whiteSpace: "nowrap",
          }}
        >
          랜덤 변경
        </Button>
      </Stack>

      <Paper
        elevation={0}
        sx={{
          border: "1px solid var(--bg-300)",
          borderRadius: 2,
          p: 2,
          backgroundColor: "var(--bg-100)",
          mb: 1.5,
        }}
      >
        <TextField
          fullWidth
          multiline
          placeholder="댓글을 입력하세요"
          variant="standard"
          value={input}
          onChange={(e) => {
            const value = e.target.value;
            if (value.length <= MAX_COMMENT_LENGTH) {
              setInput(value);
              setInputError("");
            } else {
              setInputError(
                `최대 ${MAX_COMMENT_LENGTH}자까지 입력할 수 있어요.`
              );
            }
          }}
          error={!!inputError}
          InputProps={{ disableUnderline: true }}
          sx={{ fontSize: 14 }}
          helperText={
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                width: "100%",
                mt: 0.5,
              }}
            >
              <Typography
                component="span"
                sx={{
                  color: inputError ? "error.main" : "var(--text-300)",
                  fontSize: 12,
                }}
              >
                {inputError || `${input.length}/${MAX_COMMENT_LENGTH}`}
              </Typography>
            </Box>
          }
        />
      </Paper>

      <Typography
        variant="body2"
        sx={{ color: "var(--text-400)", fontSize: 12, mb: 2 }}
      >
        입력한 댓글은 수정하거나 삭제할 수 없어요. 또한 허위사실, 욕설, 사칭 등
        댓글은 통보없이 삭제될 수 있습니다.
      </Typography>

      <Box textAlign="right">
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!input.trim()}
          sx={{
            backgroundColor: "var(--primary-100)",
            color: "var(--text-600)",
            boxShadow: "none",
            fontWeight: 500,
            fontSize: 14,
            borderRadius: 2,
            px: 3,
            "&:hover": {
              backgroundColor: "var(--primary-200)",
              boxShadow: "none",
            },
          }}
        >
          댓글 남기기
        </Button>
      </Box>
    </Box>
  );
}