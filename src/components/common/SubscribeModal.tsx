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
import { subscribe, unsubscribe } from "../../lib/api/subscriptionApi";
import { isAxiosErrorWithStatus } from "../../lib/utils/isAxiosErrorWithStatus";
import subscribeImage from "../../assets/subscribe.gif";
import heartAttackImage from "../../assets/heartattack.gif";
import duplicateImage from "../../assets/pleading.gif";
import cancleImage from "../../assets/bye.gif";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SubscribeModal({ open, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [unsubscribed, setUnsubscribed] = useState(false);

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    if (!email) {
      setError("이메일을 입력해주세요.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("올바른 이메일 주소를 입력해주세요.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await subscribe({ email });
      setSubmitted(true);
    } catch (err: unknown) {
      if (isAxiosErrorWithStatus(err, 409)) {
        setIsDuplicate(true);
      } else if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as any).response?.data?.message === "string"
      ) {
        setError((err as any).response.data.message);
      } else {
        setError("구독 요청 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      await unsubscribe(email);
      setUnsubscribed(true);
    } catch {
      setError("구독 해지에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setSubmitted(false);
    setIsDuplicate(false);
    setUnsubscribed(false);
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
        {/* 구독 성공 */}
        {submitted && !isDuplicate && (
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

        {/* 중복 구독 */}
        {isDuplicate && !unsubscribed && (
          <Stack spacing={3} alignItems="center">
            <Box
              component="img"
              src={duplicateImage}
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
              variant="body1"
              sx={{
                fontSize: 24,
                fontWeight: 600,
                color: "var(--primary-200)",
              }}
            >
              이미 구독 중이네요
            </Typography>

            <Typography
              variant="body2"
              sx={{ textAlign: "center", color: "var(--text-300)" }}
            >
              구독을 취소하시겠어요?
            </Typography>
            <Button
              onClick={handleUnsubscribe}
              fullWidth
              variant="contained"
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
              구독 취소하기
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
        )}

        {/* 구독 해지 */}
        {unsubscribed && (
          <Stack spacing={3} alignItems="center">
            <Box
              component="img"
              src={cancleImage}
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
              variant="body1"
              sx={{
                fontSize: 24,
                fontWeight: 600,
                color: "var(--primary-200)",
              }}
            >
              구독 취소 완료
            </Typography>

            <Typography
              variant="body2"
              sx={{ textAlign: "center", color: "var(--text-300)" }}
            >
              언제든 다시 돌아와주세요!
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

        {/* 입력 폼 */}
        {!submitted && !isDuplicate && !unsubscribed && (
          <>
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
              sx={{ mb: 3, borderColor: "var(--text-400)", opacity: 0.3 }}
            />

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

            <Stack spacing={2}>
              <Button
                variant="contained"
                fullWidth
                disableElevation
                onClick={handleSubmit}
                disabled={loading}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
