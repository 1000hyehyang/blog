import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  TextField,
  Button,
  Typography,
  Stack,
  Container,
  MenuItem,
  Chip,
  OutlinedInput,
  Input,
  InputLabel,
  Select,
} from "@mui/material";
import TiptapEditor from "../components/TiptapEditor/TiptapEditor";
import { useAuthStore } from "../store/useAuthStore";
import { createPost } from "../lib/api/postApi";
import { uploadThumbnail } from "../lib/api/fileApi";
import type { SelectChangeEvent } from "@mui/material";

const categoryList = ["개발", "DevOps", "디자인", "프로젝트/회고", "기타"];

export default function NewPostPage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [html, setHtml] = useState("");

  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!isAdmin) {
      alert("접근 권한이 없습니다.");
      navigate("/", { replace: true });
    }
  }, [isAdmin, navigate]);

  const handleThumbnailChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const uploaded = await uploadThumbnail(file);
      console.log("썸네일 업로드 성공:", uploaded);
      setThumbnailUrl(uploaded.url);
    } catch (err) {
      console.error("썸네일 업로드 실패", err);
      alert("썸네일 업로드에 실패했습니다.");
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const value = e.currentTarget.value.trim();
      if (value && !tags.includes(value)) {
        setTags((prev) => [...prev, value]);
      }
      e.currentTarget.value = "";
    }
  };

  const handleTagDelete = (tagToDelete: string) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToDelete));
  };

  const handleSubmit = async () => {
    if (!title || !category || !html) {
      alert("제목, 카테고리, 본문은 필수입니다.");
      return;
    }

    const payload = {
      title,
      category,
      html,
      content: html.replace(/<[^>]+>/g, "").slice(0, 150),
      thumbnailUrl: thumbnailUrl || undefined,
      tags,
    };

    console.log("📦 최종 전송할 payload:", payload);

    try {
      const postId = await createPost(payload);
      navigate(`/post/${postId}`);
    } catch (err) {
      console.error("게시글 등록 실패", err);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" fontWeight={700} mb={4}>
        NEW POST
      </Typography>

      <Stack spacing={3}>
        {/* 제목 */}
        <TextField
          label="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          variant="standard"
          InputProps={{
            disableUnderline: true,
            sx: { fontSize: "1.5rem", fontWeight: 600, py: 1 },
          }}
          InputLabelProps={{
            shrink: true,
            sx: { fontSize: "1rem", color: "var(--text-400)" },
          }}
        />

        {/* 카테고리 */}
        <Box>
          <InputLabel shrink sx={{ mb: 1, fontSize: "1rem" }}>
            카테고리
          </InputLabel>
          <Select
            value={category}
            onChange={(e: SelectChangeEvent<string>) =>
              setCategory(e.target.value)
            }
            fullWidth
            displayEmpty
            input={<OutlinedInput />}
            sx={{
              borderRadius: 2,
              backgroundColor: "var(--bg-200)",
              fontSize: "0.95rem",
              fontWeight: 500,
              ".MuiOutlinedInput-notchedOutline": {
                borderColor: "var(--bg-200)",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "var(--primary-100)",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "var(--primary-100)",
              },
            }}
          >
            <MenuItem value="" disabled sx={{ color: "var(--text-300)" }}>
              카테고리를 선택하세요
            </MenuItem>
            {categoryList.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </Select>
        </Box>
        {/* 썸네일 업로드 */}
        <Box>
          <InputLabel shrink sx={{ mb: 1 }}>
            썸네일 이미지
          </InputLabel>
          <Button variant="outlined" component="label">
            이미지 업로드
            <input
              hidden
              accept="image/*"
              type="file"
              onChange={handleThumbnailChange}
            />
          </Button>

          {thumbnailUrl && (
            <Box mt={2}>
              <img
                src={thumbnailUrl}
                alt="썸네일 미리보기"
                style={{ maxWidth: "100%", borderRadius: 8 }}
                onError={() => console.warn("이미지 로드 실패", thumbnailUrl)}
              />
            </Box>
          )}
        </Box>

        {/* 태그 입력 */}
        <Box>
          <InputLabel shrink sx={{ mb: 1 }}>
            태그 (Enter 또는 , 로 추가)
          </InputLabel>
          <Input
            fullWidth
            disableUnderline={false}
            onKeyDown={handleTagKeyDown}
            placeholder="예: react, springboot"
            sx={{
              fontSize: "0.95rem",
              fontWeight: 400,
              color: "var(--text-100)",
              borderBottom: "1px solid var(--bg-300)",
              "&:hover": {
                borderBottom: "1px solid var(--primary-100)",
              },
              "&.Mui-focused": {
                borderBottom: "1px solid var(--primary-100)",
              },
            }}
          />

          <Box mt={2} display="flex" gap={1} flexWrap="wrap">
            {tags.map((tag) => (
              <Chip
                key={tag}
                label={`#${tag}`}
                onDelete={() => handleTagDelete(tag)}
                sx={{
                  fontSize: "0.875rem",
                  backgroundColor: "var(--bg-200)",
                  color: "var(--text-300)",
                  borderRadius: 8,
                }}
              />
            ))}
          </Box>
        </Box>

        {/* 본문 에디터 */}
        <TiptapEditor value={html} onChange={setHtml} />

        {/* 저장 버튼 */}
        <Box textAlign="right">
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{
              color: "var(--text-600)",
              backgroundColor: "var(--primary-100)",
              boxShadow: "none",
              fontWeight: 500,
              borderRadius: 2,
              px: 3,
              "&:hover": {
                backgroundColor: "var(--primary-200)",
                boxShadow: "none",
              },
            }}
          >
            저장하기
          </Button>
        </Box>
      </Stack>
    </Container>
  );
}
