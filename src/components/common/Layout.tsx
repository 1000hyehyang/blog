import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";
import Navbar from "./Navbar/Navbar";
import Footer from "./Footer";

export default function Layout() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "var(--bg-100)",
      }}
    >
      <Navbar />
      <Box
        component="main"
        sx={{
          flex: 1,
          width: "100%",
          maxWidth: "1140px",
          mx: "auto",
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 4, md: 6 },
        }}
      >
        <Outlet />
      </Box>
      <Footer />
    </Box>
  );
}
