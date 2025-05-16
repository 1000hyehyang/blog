import { Box, Typography } from "@mui/material";

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        width: "100%",
        borderTop: "1px solid var(--border)", 
        backgroundColor: "var(--bg-10)",  
        py: 3,
        mt: 4,
      }}
    >
      <Box
        sx={{
          maxWidth: "1040px",
          mx: "auto",
          px: { xs: 2, sm: 3, md: 4 },
          textAlign: "center",
        }}
      >
        <Typography variant="body2" sx={{ color: "var(--text-300)" }}> 
          © {new Date().getFullYear()} MyBlog. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
}
