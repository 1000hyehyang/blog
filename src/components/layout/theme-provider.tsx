"use client";

import { MotionConfig } from "framer-motion";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

const reducedMotion = process.env.NODE_ENV === "production" ? "user" : "never";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
    >
      <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>
    </NextThemesProvider>
  );
}
