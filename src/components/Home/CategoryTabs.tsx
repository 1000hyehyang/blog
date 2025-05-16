// src/components/Home/CategoryTabs.tsx
import { Tabs, Tab, Box } from "@mui/material";
import { useState } from "react";

const categories = ["전체", "개발", "데이터/ML", "디자인"];

export default function CategoryTabs() {
  const [selectedTab, setSelectedTab] = useState(0);

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  return (
    <Box
      sx={{
        borderBottom: "1px solid var(--border)",
        mb: 4,
      }}
    >
      <Tabs
        value={selectedTab}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          ".MuiTab-root": {
            color: "var(--text-400)",
            fontWeight: 500,
            fontSize: "1rem",
            px: 2,
            textTransform: "none",
          },
          ".Mui-selected": {
            color: "var(--amber-500)",
            fontWeight: 500,
          },
          ".MuiTabs-indicator": {
            backgroundColor: "var(--amber-500)",
          },
        }}
      >
        {categories.map((label, index) => (
          <Tab key={index} label={label} />
        ))}
      </Tabs>
    </Box>
  );
}