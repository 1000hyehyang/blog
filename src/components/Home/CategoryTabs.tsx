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
        border: "none",
        mb: 4,
      }}
    >
      <Tabs
        value={selectedTab}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          ".MuiTabs-indicator": {
            backgroundColor: "var(--primary-200)",
          },
        }}
      >
        {categories.map((label, index) => (
          <Tab
            key={index}
            label={label}
            sx={{
              color:
                selectedTab === index ? "var(--primary-200)" : "var(--text-400)",
              fontWeight: 500,
              fontSize: "1rem",
              px: 2,
              textTransform: "none",
            }}
          />
        ))}
      </Tabs>
    </Box>
  );
}
