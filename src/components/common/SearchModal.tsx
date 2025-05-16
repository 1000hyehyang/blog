// src/components/common/SearchModal.tsx
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  TextField,
  Typography,
  Fade,
} from "@mui/material";
import { forwardRef } from "react";
import type { TransitionProps } from "@mui/material/transitions";
import logo from "../../assets/logo.svg";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { useEffect, useRef, useState } from "react";
import { dummyPostList } from "../../data/dummyPosts";
import { useNavigate } from "react-router-dom";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>
) {
  return <Fade ref={ref} timeout={200} {...props} />;
});

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [recent, setRecent] = useState<string[]>([]);

  // 포커싱
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const handleClose = () => {
    setKeyword("");
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && keyword.trim()) {
      handleSaveRecent(keyword);
    }
  };

  const handleSaveRecent = (value: string) => {
    const updated = [value, ...recent.filter((item) => item !== value)].slice(
      0,
      5
    );
    setRecent(updated);
  };

  const filteredPosts = dummyPostList.filter((post) =>
    post.title.toLowerCase().includes(keyword.toLowerCase())
  );

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      PaperProps={{ sx: { backgroundColor: "var(--bg-100)" } }}
    >
      <Box
        component="img"
        mt={4}
        src={logo}
        alt="로고"
        sx={{
          height: { xs: 24, sm: 28, md: 20 },
          display: "block",
        }}
      />
      <DialogContent sx={{ py: 4 }}>
        <Box
          sx={{
            maxWidth: "700px",
            mx: "auto",
            px: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
            border: "1px solid var(--text-500)",
            "&:hover": {
              borderColor: "var(--primary-100)",
            },
            "&:focus-within": {
              borderColor: "var(--primary-100)",
            },
            borderRadius: 2,
            py: 0.5,
          }}
        >
          <SearchIcon sx={{ color: "var(--text-400)" }} />
          <TextField
            fullWidth
            placeholder="주제, 시리즈 검색"
            inputRef={inputRef}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            variant="standard"
            InputProps={{ disableUnderline: true }}
            sx={{ input: { fontSize: "1.1rem" } }}
          />
          <IconButton onClick={handleClose}>
            <CloseIcon sx={{ color: "var(--text-400)" }} />
          </IconButton>
        </Box>

        <Box sx={{ mt: 4, maxWidth: "700px", mx: "auto" }}>
          {keyword.trim() ? (
            <Stack spacing={2}>
              {filteredPosts.map((post) => (
                <Box
                  key={post.id}
                  display="flex"
                  gap={2}
                  alignItems="center"
                  sx={{ cursor: "pointer" }}
                  onClick={() => {
                    navigate(`/post/${post.id}`);
                    handleClose();
                  }}
                >
                  <Box
                    component="img"
                    src={post.thumbnailUrl}
                    alt="썸네일"
                    sx={{
                      width: 64,
                      height: 48,
                      borderRadius: 2,
                      objectFit: "cover",
                    }}
                  />
                  <Typography variant="body1" sx={{ color: "var(--text-100)" }}>
                    {post.title}
                  </Typography>
                </Box>
              ))}
              {filteredPosts.length === 0 && (
                <Typography sx={{ color: "var(--text-300)" }}>
                  "{keyword}"에 대한 검색 결과가 없습니다.
                </Typography>
              )}
            </Stack>
          ) : (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ color: "var(--text-300)", mb: 1 }}
              >
                최근 검색어
              </Typography>
              <Stack spacing={1}>
                {recent.length === 0 && (
                  <Typography variant="body2" sx={{ color: "var(--text-400)" }}>
                    최근 검색어가 없습니다.
                  </Typography>
                )}
                {recent.map((word, i) => (
                  <Typography
                    key={i}
                    variant="body2"
                    sx={{ color: "var(--text-200)", cursor: "pointer" }}
                    onClick={() => setKeyword(word)}
                  >
                    {word}
                  </Typography>
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
