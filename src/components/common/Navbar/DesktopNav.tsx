// src/components/common/Navbar/DesktopNav.tsx
import { Box, Stack, Button, IconButton } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { Link } from "react-router-dom";

export default function DesktopNav() {
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Link to="https://toss.tech/slash" target="_blank" rel="noopener noreferrer">
        <Box component="span" sx={{ color: "var(--text-300)", fontWeight: 500, fontSize: "0.95rem" }}>
          SLASH
        </Box>
      </Link>

      <Link to="https://toss.tech/simplicity" target="_blank" rel="noopener noreferrer">
        <Box component="span" sx={{ color: "var(--text-300)", fontWeight: 500, fontSize: "0.95rem" }}>
          SIMPLICITY
        </Box>
      </Link>

      <Button
        variant="contained"
        sx={{
          fontWeight: 600,
          borderRadius: 2,
          textTransform: "none",
          px: 2.5,
          py: 1,
          backgroundColor: "#3b82f6", // TossTech 스타일의 파란색
          '&:hover': {
            backgroundColor: "#2563eb",
          }
        }}
      >
        구독하기
      </Button>

      <Button
        variant="outlined"
        sx={{
          fontWeight: 500,
          borderRadius: 2,
          textTransform: "none",
          px: 2,
          py: 1,
          color: "var(--text-300)",
          borderColor: "var(--bg-300)",
          backgroundColor: "var(--bg-200)",
          '&:hover': {
            backgroundColor: "var(--bg-300)",
          }
        }}
      >
        로그인
      </Button>

      <IconButton sx={{ color: "var(--text-400)" }}>
        <SearchIcon />
      </IconButton>
    </Stack>
  );
}
