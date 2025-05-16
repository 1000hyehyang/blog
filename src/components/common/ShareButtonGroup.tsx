import { Box, IconButton, Tooltip } from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import TwitterIcon from "@mui/icons-material/Twitter";
import FacebookIcon from "@mui/icons-material/Facebook";

interface ShareButtonGroupProps {
  title: string;
  shareUrl?: string;
}

export default function ShareButtonGroup({
  title,
  shareUrl = window.location.href,
}: ShareButtonGroupProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("📎 링크가 복사되었습니다!");
    } catch {
      alert("링크 복사에 실패했습니다.");
    }
  };

  const openInNewTab = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      title
    )}&url=${encodeURIComponent(shareUrl)}`;
    openInNewTab(url);
  };

  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      shareUrl
    )}`;
    openInNewTab(url);
  };

  return (
    <Box display="flex" gap={1}>
      {/* 📎 링크 복사 */}
      <Tooltip
        title="링크 복사"
        arrow
        componentsProps={{
          tooltip: {
            sx: {
              bgcolor: "var(--primary-100)",
              color: "var(--text-600)",
              fontSize: 13,
              "& .MuiTooltip-arrow": {
                color: "var(--primary-100)",
              },
            },
          },
        }}
      >
        <IconButton
          onClick={handleCopy}
          sx={{
            bgcolor: "var(--bg-200)",
            color: "var(--text-300)",
            "&:hover": {
              bgcolor: "var(--primary-100)",
              color: "var(--text-600)",
            },
          }}
        >
          <AttachFileIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* X (Twitter) */}
      <Tooltip
        title="X에 공유"
        arrow
        componentsProps={{
          tooltip: {
            sx: {
              bgcolor: "var(--text-200)",
              color: "var(--text-600)",
              fontSize: 13,
              "& .MuiTooltip-arrow": {
                color: "var(--text-200)",
              },
            },
          },
        }}
      >
        <IconButton
          onClick={handleTwitterShare}
          sx={{
            bgcolor: "var(--text-100)",
            color: "var(--text-600)",
            "&:hover": {
              bgcolor: "var(--text-200)",
            },
          }}
        >
          <TwitterIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* 페이스북 */}
      <Tooltip
        title="페이스북 공유"
        arrow
        componentsProps={{
          tooltip: {
            sx: {
              bgcolor: "#1877f2",
              color: "var(--text-600)",
              fontSize: 13,
              "& .MuiTooltip-arrow": {
                color: "#1877f2",
              },
            },
          },
        }}
      >
        <IconButton
          onClick={handleFacebookShare}
          sx={{
            bgcolor: "#1877f2",
            color: "var(--text-600)",
            "&:hover": {
              bgcolor: "#165fd4",
            },
          }}
        >
          <FacebookIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
