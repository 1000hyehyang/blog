import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
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
          borderRadius: 4,
        },
      }}
    >
      <DialogTitle
        sx={{
          textAlign: "center",
          fontWeight: 600,
          pb: 1,
          color: "var(--text-200)",
        }}
      >
        로그인
      </DialogTitle>

      <IconButton
        onClick={onClose}
        sx={{ position: "absolute", top: 8, right: 8,           color: "var(--text-400)", }}
      >
        <CloseIcon />
      </IconButton>

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
              borderColor: "#ddd",
              fontWeight: 500,
              "&:hover": { backgroundColor: "#f5f5f5" },
              textTransform: "none",
              py: 1.5,
              borderRadius: 2,
            }}
          >
            Google 계정으로 로그인
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}