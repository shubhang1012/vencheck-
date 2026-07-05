"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import type { ReactNode } from "react";

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: string;
  storageKey?: string;
}

function ThemeProvider({
  children,
  defaultTheme = "system",
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

export { ThemeProvider, useTheme };
