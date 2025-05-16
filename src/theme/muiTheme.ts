// src/theme/muiTheme.ts
import { createTheme } from "@mui/material";

const muiTheme = createTheme({
  typography: {
    fontFamily: "Pretendard, sans-serif",
  },
  palette: {
    mode: "light",
    primary: {
      main: "#f59e0b", // var(--primary-200)
    },
  },
});

export default muiTheme;
