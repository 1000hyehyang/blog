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
import { forwardRef, useEffect, useRef, useState } from "react";
import type { TransitionProps } from "@mui/material/transitions";
import logo from "../../assets/logo.svg";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";
import { getRecentPosts } from "../../lib/api/postApi";
import type { PostSummary } from "../../types/post";

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
  const [allPosts, setAllPosts] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const posts = await getRecentPosts(100); // 최대 100개까지
        setAllPosts(posts);
      } catch (err) {
        console.error("게시글 불러오기 실패", err);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchPosts();
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

  const filteredPosts = allPosts.filter((post) =>
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
            border: "1.5px solid var(--text-500)",
            "&:hover": {
              borderColor: "var(--primary-100)",
            },
            "&:focus-within": {
              borderColor: "var(--primary-100)",
            },
            borderRadius: 12,
            py: 0.5,
          }}
        >
          <SearchIcon sx={{ color: "var(--text-400)" }} />
          <TextField
            fullWidth
            placeholder="검색어를 입력해주세요"
            inputRef={inputRef}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            variant="standard"
            InputProps={{ disableUnderline: true }}
            sx={{ input: { fontSize: "1rem" } }}
          />
          <IconButton onClick={handleClose}>
            <CloseIcon sx={{ color: "var(--text-400)" }} />
          </IconButton>
        </Box>

        <Box sx={{ mt: 4, maxWidth: "700px", mx: "auto" }}>
          {keyword.trim() ? (
            loading ? (
              <Typography sx={{ color: "var(--text-300)" }}>
                불러오는 중...
              </Typography>
            ) : filteredPosts.length > 0 ? (
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
                    <Typography
                      variant="body1"
                      sx={{ color: "var(--text-100)" }}
                    >
                      {post.title}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography sx={{ color: "var(--text-300)" }}>
                "{keyword}"에 대한 검색 결과가 없습니다.
              </Typography>
            )
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