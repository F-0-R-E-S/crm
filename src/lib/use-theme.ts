"use client";
import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("router:theme") as Theme | null;
    if (stored === "light" || stored === "dark") setThemeState(stored);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("light", theme === "light");
    localStorage.setItem("router:theme", theme);
  }, [theme]);

  return [theme, setThemeState];
}
