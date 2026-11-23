"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useEffect } from "react";
import { applyThemeColor, THEME_PRESETS } from "@/lib/color-utils";

export function ThemeProvider({ children, themeColor, themeMode }: { children: React.ReactNode; themeColor?: string; themeMode?: string }) {
  useEffect(() => {
    const color = themeColor || "#171717";
    const preset = THEME_PRESETS.find((p) => p.color === color);
    document.documentElement.classList.forEach((c) => { if (c.startsWith("theme-")) document.documentElement.classList.remove(c); });
    const cls = preset ? (preset.name === "Padrão" ? "theme-default" : "theme-" + preset.name.toLowerCase().replace(/[^a-z]/g, "")) : "theme-default";
    document.documentElement.classList.add(cls);
    applyThemeColor(color);
    const applyMode = () => {
      if (themeMode === "dark") document.documentElement.classList.add("dark");
      else if (themeMode === "light") document.documentElement.classList.remove("dark");
      else {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
      }
    };
    applyMode();
    if (themeMode === "system" || !themeMode) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyMode();
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [themeColor, themeMode]);
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
