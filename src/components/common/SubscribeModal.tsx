// src/components/common/SubscribeModal.tsx
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  Button,
  Divider,
  TextField,
  Box,
} from "@mui/material";
import { useState } from "react";
import subscribeImage from "../../assets/subscribe.gif";
import heartAttackImage from "../../assets/heartattack.gif";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SubscribeModal({ open, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidEmail = (email: string) => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  };

  const handleSubmit = () => {
    if (!email) {
      setError("이메일을 입력해주세요.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("올바른 이메일 주소를 입력해주세요.");
      return;
    }

    setError(null);
    setSubmitted(true);
  };

  const handleClose = () => {
    setEmail("");
    setSubmitted(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          py: 2,
          px: 2,
          borderRadius: 4,
        },
      }}
    >
      <DialogTitle
        sx={{
          textAlign: "center",
          fontWeight: 600,
          fontSize: 24,
          pb: 1,
          color: "var(--text-200)",
        }}
      >
        콘텐츠 구독
      </DialogTitle>

      <DialogContent>
        {!submitted ? (
          <>
            {/* 상단 이미지 */}
            <Box
              component="img"
              src={subscribeImage}
              alt="subscribe"
              sx={{
                width: 80,
                height: 80,
                display: "block",
                mx: "auto",
                mb: 2,
              }}
            />

            <Typography
              variant="body2"
              sx={{
                textAlign: "center",
                mb: 3,
                color: "var(--text-300)",
                fontSize: { xs: 14, sm: 15 },
              }}
            >
              새로운 글이 올라오면
              <br />
              이메일로 알려드릴게요!
            </Typography>

            <Divider
              sx={{
                mb: 3,
                borderColor: "var(--text-400)",
                opacity: 0.3,
              }}
            />

            {/* 이메일 입력 필드 */}
            <Stack spacing={1} mb={3}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 500,
                  fontSize: 14,
                  color: "var(--text-300)",
                  mb: 0.5,
                }}
              >
                이메일
              </Typography>

              <TextField
                placeholder="ex) you@gmail.com"
                fullWidth
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                size="small"
                variant="outlined"
                error={!!error}
                helperText={error}
                sx={{
                  input: {
                    fontSize: "0.95rem",
                    py: { xs: 1.2, sm: 1.5 },
                    borderRadius: 2,
                  },
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: "var(--bg-300)",
                    },
                    "&:hover fieldset": {
                      borderColor: "var(--primary-50)",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "var(--primary-100)",
                    },
                    "& .MuiFormHelperText-root": {
                      mt: 0.5,
                      fontSize: 13,
                      color: "var(--primary-200)",
                    },
                  },
                }}
              />
            </Stack>

            {/* 버튼 영역 */}
            <Stack spacing={2}>
              <Button
                variant="contained"
                fullWidth
                disableElevation
                onClick={handleSubmit}
                sx={{
                  backgroundColor: "var(--primary-100)",
                  color: "var(--text-600)",
                  fontWeight: 500,
                  borderRadius: 2,
                  py: { xs: 1.2, sm: 1.5 },
                  fontSize: { xs: 14, sm: 15 },
                  textTransform: "none",
                  boxShadow: "none",
                  "&:hover": {
                    backgroundColor: "var(--primary-200)",
                    boxShadow: "none",
                  },
                }}
              >
                구독하기
              </Button>

              <Button
                onClick={handleClose}
                fullWidth
                disableRipple
                sx={{
                  fontWeight: 500,
                  color: "var(--text-300)",
                  textTransform: "none",
                  py: { xs: 1.2, sm: 1.5 },
                  fontSize: { xs: 14, sm: 15 },
                  borderRadius: 2,
                  boxShadow: "none",
                  "&:hover": { backgroundColor: "var(--bg-100)" },
                }}
              >
                닫기
              </Button>
            </Stack>
          </>
        ) : (
          <Stack spacing={3} alignItems="center">
            <Box
              component="img"
              src={heartAttackImage}
              alt="success"
              sx={{ width: 80, height: 80, display: "block", mx: "auto" }}
            />
            <Typography
              variant="body1"
              sx={{
                fontSize: 24,
                fontWeight: 600,
                color: "var(--primary-200)",
              }}
            >
              감사합니다!
            </Typography>
            <Typography
              variant="body2"
              sx={{ textAlign: "center", color: "var(--text-300)" }}
            >
              앞으로 새로운 글이 올라오면 <br />
              이메일로 바로 알려드릴게요🥰
            </Typography>
            <Button
              onClick={handleClose}
              fullWidth
              disableRipple
              sx={{
                fontWeight: 500,
                color: "var(--text-300)",
                textTransform: "none",
                py: { xs: 1.2, sm: 1.5 },
                fontSize: { xs: 14, sm: 15 },
                borderRadius: 2,
                boxShadow: "none",
                "&:hover": { backgroundColor: "var(--bg-100)" },
              }}
            >
              닫기
            </Button>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
