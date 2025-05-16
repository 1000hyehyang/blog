import { Box } from "@mui/material";
import banner from "../../assets/banner.svg";

export default function HeroBanner() {
  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "1140px",
        mx: "auto",
        mb: { xs: 3, md: 4 },
        aspectRatio: {
          xs: "4 / 1",
          sm: "1140 / 200",
        },
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Box
        component="img"
        src={banner}
        alt="배너 이미지"
        sx={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </Box>
  );
}
