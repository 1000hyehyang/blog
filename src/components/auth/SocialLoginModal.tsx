import {
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  Button,
  Divider,
} from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import GoogleIcon from "@mui/icons-material/Google";

interface SocialLoginModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SocialLoginModal({
  open,
  onClose,
}: SocialLoginModalProps) {
  const oauthBaseUrl = import.meta.env.VITE_OAUTH_BASE_URL;

  const handleLogin = (provider: "github" | "google") => {
    window.location.href = `${oauthBaseUrl}/${provider}`;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          py: 0.5,
          borderRadius: 4,
        },
      }}
    >
      <DialogTitle
        sx={{
          textAlign: "center",
          fontWeight: 600,
          fontSize: 28,
          pb: 1,
          color: "var(--text-200)",
        }}
      >
        BLOG
      </DialogTitle>

      <DialogContent
        sx={{
          borderRadius: 2,
          pt: 1,
        }}
      >
        <Typography
          variant="body2"
          sx={{ textAlign: "center", mb: 3, color: "var(--text-300)" }}
        >
          소셜 계정으로 간편하게 로그인하세요
        </Typography>

        {/* 경계선 */}
        <Divider
          sx={{
            mb: 3,
            borderColor: "var(--text-400)",
            opacity: 0.3,
          }}
        />

        <Stack spacing={2}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<GitHubIcon />}
            onClick={() => handleLogin("github")}
            sx={{
              backgroundColor: "#24292f",
              color: "var(--text-600)",
              fontWeight: 500,
              "&:hover": { backgroundColor: "#1b1f23" },
              textTransform: "none",
              py: 1.5,
              borderRadius: 2,
            }}
          >
            GitHub 계정으로 로그인
          </Button>

          <Button
            variant="outlined"
            fullWidth
            startIcon={<GoogleIcon />}
            onClick={() => handleLogin("google")}
            sx={{
              color: "#555",
              borderColor: "var(--bg-300)",
              fontWeight: 500,
              "&:hover": { backgroundColor: "var(--bg-100)" },
              textTransform: "none",
              py: 1.5,
              borderRadius: 2,
            }}
          >
            Google 계정으로 로그인
          </Button>

          {/* 닫기 버튼 */}
          <Button
            onClick={onClose}
            fullWidth
            sx={{
              mt: 3,
              color: "var(--text-300)",
              "&:hover": { backgroundColor: "var(--bg-100)" },
              textTransform: "none",
              py: 1.5,
              fontWeight: 500,
            }}
          >
            닫기
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
