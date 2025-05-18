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
import { createComment } from "../../lib/api/postApi";
import { useParams } from "react-router-dom";

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
  const { id } = useParams();
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState("");
  const [nickname, setNickname] = useState("익명의 댓글");
  const [currentEmoji, setCurrentEmoji] = useState("🦊");
  const [currentAvatarBg, setCurrentAvatarBg] = useState(avatarBgColors[0]);
  const [loading, setLoading] = useState(false);

  const handleRandomize = () => {
    const emoji = emojiPool[Math.floor(Math.random() * emojiPool.length)];
    const bg =
      avatarBgColors[Math.floor(Math.random() * avatarBgColors.length)];
    setCurrentEmoji(emoji);
    setCurrentAvatarBg(bg);
  };

  const handleSubmit = async () => {
    if (!input.trim() || !id) return;

    const newComment = {
      nickname,
      content: input.trim(),
      emoji: currentEmoji,
      bgColor: currentAvatarBg,
    };

    try {
      setLoading(true);
      const created = await createComment(Number(id), newComment);
      onSubmit(created);
      setInput("");
    } catch (err) {
      console.error("댓글 작성 실패", err);
      alert("댓글 작성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
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
            const val = e.target.value;
            if (val.length <= MAX_NICKNAME_LENGTH) setNickname(val);
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
          sx={{ borderRadius: 2, fontSize: 13, height: 36 }}
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
          variant="standard"
          placeholder="댓글을 입력하세요"
          value={input}
          onChange={(e) => {
            const val = e.target.value;
            if (val.length <= MAX_COMMENT_LENGTH) {
              setInput(val);
              setInputError("");
            } else {
              setInputError(
                `최대 ${MAX_COMMENT_LENGTH}자까지 입력할 수 있어요.`
              );
            }
          }}
          error={!!inputError}
          InputProps={{ disableUnderline: true }}
          helperText={inputError}
        />

        <Box display="flex" justifyContent="flex-end" mt={0.5}>
          <Typography fontSize={12} color="var(--text-300)">
            {`${input.length}/${MAX_COMMENT_LENGTH}`}
          </Typography>
        </Box>
      </Paper>

      <Typography
        variant="body2"
        sx={{ color: "var(--text-400)", fontSize: 12, mb: 2 }}
      >
        입력한 댓글은 수정하거나 삭제할 수 없어요. 허위사실, 욕설, 사칭 댓글은
        통보 없이 삭제될 수 있습니다.
      </Typography>

      <Box textAlign="right">
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!input.trim() || loading}
          sx={{
            backgroundColor: "var(--primary-100)",
            color: "var(--text-600)",
            fontWeight: 500,
            borderRadius: 2,
            boxShadow: "none",
            px: 3,
            "&:hover": {
              boxShadow: "none",
              backgroundColor: "var(--primary-200)",
            },
          }}
        >
          댓글 남기기
        </Button>
      </Box>
    </Box>
  );
}
