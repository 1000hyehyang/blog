// src/components/common/MobileNav.tsx
import {
  Box,
  IconButton,
  Button,
  Stack,
  Collapse,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Box>
      {/* 햄버거 버튼 */}
      <IconButton onClick={() => setOpen((prev) => !prev)}>
        {open ? (
          <CloseIcon sx={{ color: "var(--primary-200)" }} />
        ) : (
          <MenuIcon sx={{ color: "var(--text-300)" }} />
        )}
      </IconButton>

      {/* 드롭다운 메뉴 (Collapse 사용) */}
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box
          sx={{
            px: 3,
            py: 4,
            bgcolor: "white", // 또는 var(--bg-100)
            borderTop: "1px solid var(--border)",
          }}
        >
          {/* 검색 및 기타 링크 */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <IconButton>
              <SearchIcon sx={{ color: "var(--text-400)" }} />
            </IconButton>
            {/* 닫기 버튼은 햄버거로 대체됨 */}
          </Stack>

          {/* 메뉴 버튼들 */}
          <Stack spacing={2}>
            <Button
              variant="contained"
              fullWidth
              sx={{
                backgroundColor: "var(--primary-200)",
                "&:hover": { backgroundColor: "var(--primary-300)" },
                fontWeight: 600,
              }}
            >
              구독하기
            </Button>

            <Link to="/login">
              <Button
                fullWidth
                sx={{
                  backgroundColor: "var(--bg-200)",
                  fontWeight: 500,
                  color: "var(--text-300)",
                }}
              >
                로그인
              </Button>
            </Link>
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
}
