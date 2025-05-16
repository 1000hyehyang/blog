// src/pages/NewPostPage.tsx
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
  InputLabel,
  Select,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import TiptapEditor from "../components/TiptapEditor/TiptapEditor";
import { useAuthStore } from "../store/useAuthStore";

const categoryList = ["개발", "DevOps", "디자인", "프로젝트/회고", "기타"];

export default function NewPostPage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [html, setHtml] = useState("");

  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user); // ✅ 사용자 정보 가져오기
  const isAdmin = user?.role === "ADMIN"; // ✅ 관리자 여부 확인

  // ✅ 접근 제한: 관리자가 아니면 홈으로 리디렉션
  useEffect(() => {
    if (!isAdmin) {
      alert("접근 권한이 없습니다.");
      navigate("/", { replace: true });
    }
  }, [isAdmin, navigate]);

  // 썸네일 미리보기 해제 (cleanup)
  useEffect(() => {
    return () => {
      if (thumbnailPreview) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [thumbnailPreview]);

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnail(file);
      setThumbnailPreview(URL.createObjectURL(file));
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

  const handleSubmit = () => {
    if (!title || !category || !html) {
      alert("제목, 카테고리, 본문은 필수입니다.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("category", category);
    formData.append("html", html);
    formData.append("tags", JSON.stringify(tags));
    if (thumbnail) {
      formData.append("thumbnail", thumbnail);
    }

    console.log({
      title,
      category,
      tags,
      html,
      thumbnail,
    });

    alert("✅ 작성 완료 (콘솔 확인)");
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
        />

        {/* 카테고리 */}
        <Box>
          <InputLabel shrink sx={{ mb: 1 }}>
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
          >
            <MenuItem value="" disabled>
              선택하세요
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
          {thumbnailPreview && (
            <Box mt={2}>
              <img
                src={thumbnailPreview}
                alt="썸네일 미리보기"
                style={{ maxWidth: "100%", borderRadius: 8 }}
              />
            </Box>
          )}
        </Box>

        {/* 태그 입력 */}
        <Box>
          <InputLabel shrink sx={{ mb: 1 }}>
            태그 (Enter 또는 , 로 추가)
          </InputLabel>
          <OutlinedInput
            fullWidth
            onKeyDown={handleTagKeyDown}
            placeholder="예: react, springboot"
          />
          <Box mt={1} display="flex" gap={1} flexWrap="wrap">
            {tags.map((tag) => (
              <Chip
                key={tag}
                label={`#${tag}`}
                onDelete={() => handleTagDelete(tag)}
              />
            ))}
          </Box>
        </Box>

        {/* 본문 */}
        <TiptapEditor value={html} onChange={setHtml} />

        {/* 저장 */}
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
