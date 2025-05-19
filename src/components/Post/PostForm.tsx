import {
  Box,
  TextField,
  Button,
  Typography,
  Stack,
  Input,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Chip,
} from "@mui/material";
import { useState } from "react";
import TiptapEditor from "../TiptapEditor/TiptapEditor";

const categoryList = ["개발", "DevOps", "디자인", "프로젝트/회고", "기타"];

interface PostFormProps {
  mode: "new" | "edit";
  initialData?: {
    title: string;
    category: string;
    thumbnailUrl?: string;
    tags: string[];
    html: string;
  };
  onSubmit: (payload: PostPayload) => void;
  onDraftSubmit: (payload: PostPayload) => void;
  uploadThumbnail: (file: File) => Promise<{ url: string }>;
}

export interface PostPayload {
  title: string;
  category: string;
  content: string;
  html: string;
  thumbnailUrl?: string;
  tags: string[];
}

export default function PostForm({
  mode,
  initialData,
  onSubmit,
  onDraftSubmit,
  uploadThumbnail,
}: PostFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [category, setCategory] = useState(initialData?.category || "");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(
    initialData?.thumbnailUrl ?? null
  );
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [html, setHtml] = useState(initialData?.html || "");

  const handleThumbnailChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const uploaded = await uploadThumbnail(file);
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

  const handleSubmit = () => {
    if (!title || !category || !html) {
      alert("제목, 카테고리, 본문은 필수입니다.");
      return;
    }

    onSubmit({
      title,
      category,
      html,
      content: html.replace(/<[^>]+>/g, "").slice(0, 150),
      thumbnailUrl: thumbnailUrl || undefined,
      tags,
    });
  };

  return (
    <Box sx={{ py: 6 }}>
      <Typography variant="h4" fontWeight={700} mb={4}>
        {mode === "new" ? "NEW POST" : "EDIT POST"}
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
            sx: {
              fontSize: "1.5rem",
              fontWeight: 600,
              py: 1,
              backgroundColor: "var(--bg-100)",
              "&:focus-within": {
                backgroundColor: "var(--bg-100)",
              },
            },
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
            onChange={(e) => setCategory(e.target.value)}
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

        {/* 썸네일 */}
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

        {/* 태그 */}
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

        {/* 본문 */}
        <TiptapEditor value={html} onChange={setHtml} />

        {/* 제출 */}
        <Box display="flex" justifyContent="flex-end" gap={2}>
          <Button
            variant="outlined"
            onClick={() =>
              onDraftSubmit?.({
                title,
                category,
                html,
                content: html.replace(/<[^>]+>/g, "").slice(0, 150),
                thumbnailUrl: thumbnailUrl || undefined,
                tags,
              })
            }
            sx={{
              borderRadius: 2,
              px: 3,
              color: "var(--text-400)",
              borderColor: "var(--bg-300)",
              fontWeight: 500,
              "&:hover": {
                borderColor: "var(--primary-100)",
                color: "var(--primary-100)",
              },
            }}
          >
            임시 저장
          </Button>

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
            {mode === "new" ? "작성하기" : "수정 완료"}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
