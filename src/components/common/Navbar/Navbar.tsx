// src/components/common/Navbar.tsx
import {
  Box,
  IconButton,
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
import DesktopNav from "./DesktopNav";
import MobileNav from "./MobileNav";

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

        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton onClick={() => setSearchOpen(true)}>
            <SearchIcon sx={{ color: "var(--text-400)" }} />
          </IconButton>

          {isMobile ? (
            <IconButton onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? (
                <CloseIcon sx={{ color: "var(--primary-200)" }} />
              ) : (
                <MenuIcon sx={{ color: "var(--text-300)" }} />
              )}
            </IconButton>
          ) : (
            <DesktopNav onLoginOpen={() => setLoginOpen(true)} />
          )}
        </Stack>
      </Box>

      {isMobile && (
        <Collapse in={menuOpen} timeout="auto" unmountOnExit>
          <MobileNav onLoginOpen={() => setLoginOpen(true)} />
        </Collapse>
      )}

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <SocialLoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </Box>
  );
}
