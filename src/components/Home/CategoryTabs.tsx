// src/components/Home/CategoryTabs.tsx
import { Tabs, Tab } from "@mui/material";

interface CategoryTabsProps {
  categories: string[];
  selectedCategory: string;
  onChange: (category: string) => void;
}

export default function CategoryTabs({
  categories,
  selectedCategory,
  onChange,
}: CategoryTabsProps) {
  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    onChange(categories[newValue]);
  };

  const selectedIndex = categories.findIndex((c) => c === selectedCategory);

  return (
    <Tabs
      value={selectedIndex}
      onChange={handleChange}
      variant="scrollable"
      scrollButtons="auto"
      sx={{
        py: 3,
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
              index === selectedIndex
                ? "var(--primary-200)"
                : "var(--text-400)",
            fontWeight: 500,
            fontSize: "1rem",
            px: 2,
            textTransform: "none",
          }}
        />
      ))}
    </Tabs>
  );
}
