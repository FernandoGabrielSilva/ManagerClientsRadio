"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useEffect } from "react";
import { applyThemeColor, THEME_PRESETS } from "@/lib/color-utils";

function ThemeSync({ themeColor, themeMode }: { themeColor?: string; themeMode?: string }) {
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    const mode = !themeMode || themeMode === "system" ? "dark" : themeMode;
    setTheme(mode);
  }, [setTheme, themeMode]);

  useEffect(() => {
    const color = themeColor || "#171717";
    const preset = THEME_PRESETS.find((p) => p.color === color);
    document.documentElement.classList.forEach((c) => { if (c.startsWith("theme-")) document.documentElement.classList.remove(c); });
    const cls = preset ? (preset.name === "Padrão" ? "theme-default" : "theme-" + preset.name.toLowerCase().replace(/[^a-z]/g, "")) : "theme-default";
    document.documentElement.classList.add(cls);
    const mode = !themeMode || themeMode === "system" ? "dark" : themeMode;
    if (mode === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    applyThemeColor(color);
  }, [resolvedTheme, themeColor, themeMode]);

  return null;
}

export function ThemeProvider({ children, themeColor, themeMode }: { children: React.ReactNode; themeColor?: string; themeMode?: string }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <ThemeSync themeColor={themeColor} themeMode={themeMode} />
      {children}
    </NextThemesProvider>
  );
}
