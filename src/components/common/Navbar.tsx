import { Box, useMediaQuery, useTheme } from "@mui/material";
import { Link } from "react-router-dom";
import logo from "../../assets/logo.svg";
import mobileLogo from "../../assets/tangerine.svg";

export default function Navbar() {
  const theme = useTheme();
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <Box
      component="nav"
      sx={{
        width: "100%",
        backgroundColor: "var(--bg-100)",
      }}
    >
      <Box
        sx={{
          maxWidth: "1140px",
          mx: "auto",
          px: { xs: 2, sm: 3, md: 4 },
          py: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link to="/" style={{ textDecoration: "none" }}>
          <Box
            component="img"
            src={isMobileOrTablet ? mobileLogo : logo}
            alt="로고"
            sx={{
              height: {
                xs: 24, // 모바일
                sm: 28, // 태블릿
                md: 20, // 데스크탑
              },
              display: "block",
            }}
          />
        </Link>
      </Box>
    </Box>
  );
}