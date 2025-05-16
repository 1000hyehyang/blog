// src/components/common/Navbar.tsx
import {
  Box,
  IconButton,
  Button,
  Stack,
  Collapse,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import SearchModal from "../SearchModal";
import SocialLoginModal from "../../auth/SocialLoginModal";
import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../../assets/logo.svg";
import mobileLogo from "../../../assets/tangerine.svg";

export default function Navbar() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <Box
      component="nav"
      sx={{
        width: "100%",
        backgroundColor: "var(--bg-100)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* 상단 바 */}
      <Box
        sx={{
          maxWidth: "1140px",
          mx: "auto",
          px: { xs: 2, sm: 3, md: 4 },
          py: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* 로고 */}
        <Link to="/" style={{ textDecoration: "none" }}>
          <Box
            component="img"
            src={isMobile ? mobileLogo : logo}
            alt="로고"
            sx={{
              height: { xs: 24, sm: 28, md: 20 },
              display: "block",
            }}
          />
        </Link>

        {/* 우측 메뉴 영역 */}
        <Stack direction="row" spacing={1} alignItems="center">
          {/* 검색 아이콘 */}
          <IconButton onClick={() => setSearchOpen(true)}>
            <SearchIcon sx={{ color: "var(--text-400)" }} />
          </IconButton>

          {/* 데스크탑 버튼 */}
          {!isMobile && (
            <>
              <Button
                variant="contained"
                sx={{
                  color: "var(--text-600)",
                  backgroundColor: "var(--primary-200)",
                  boxShadow: "none",
                  fontWeight: 500,
                  borderRadius: 2,
                  px: 3,
                  "&:hover": {
                    backgroundColor: "var(--primary-100)",
                    boxShadow: "none",
                  },
                }}
              >
                구독하기
              </Button>
              <Button
                onClick={() => {
                  setLoginOpen(true);
                  setMenuOpen(false);
                }}
                sx={{
                  backgroundColor: "var(--bg-200)",
                  fontWeight: 500,
                  color: "var(--text-300)",
                  borderRadius: 2,
                  "&:hover": {
                    backgroundColor: "var(--bg-300)",
                  },
                }}
              >
                로그인
              </Button>
            </>
          )}

          {/* 모바일 햄버거 메뉴 */}
          {isMobile && (
            <IconButton onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? (
                <CloseIcon sx={{ color: "var(--primary-200)" }} />
              ) : (
                <MenuIcon sx={{ color: "var(--text-300)" }} />
              )}
            </IconButton>
          )}
        </Stack>
      </Box>

      {/* 모바일 드롭다운 메뉴 */}
      {isMobile && (
        <Collapse in={menuOpen} timeout="auto" unmountOnExit>
          <Box
            sx={{
              px: 3,
              bgcolor: "var(--bg-100)",
            }}
          >
            <Stack spacing={2}>
              <Button
                variant="contained"
                fullWidth
                sx={{
                  color: "var(--text-600)",
                  backgroundColor: "var(--primary-200)",
                  "&:hover": {
                    backgroundColor: "var(--primary-100)",
                    boxShadow: "none",
                  },
                  borderRadius: 2,
                  boxShadow: "none",
                  fontWeight: 500,
                }}
              >
                구독하기
              </Button>
              <Button
                onClick={() => setLoginOpen(true)}
                sx={{
                  backgroundColor: "var(--bg-200)",
                  color: "var(--text-300)",
                  fontWeight: 500,
                  borderRadius: 2,
                  "&:hover": {
                    backgroundColor: "var(--bg-300)",
                  },
                }}
              >
                로그인
              </Button>
            </Stack>
          </Box>
        </Collapse>
      )}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <SocialLoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </Box>
  );
}
