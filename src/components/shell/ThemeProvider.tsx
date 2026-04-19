"use client";
import { createContext, useContext, type ReactNode } from "react";
import { useTheme, type Theme } from "@/lib/use-theme";

interface Ctx {
  theme: Theme;
  setTheme: (t: Theme) => void;
}
const ThemeCtx = createContext<Ctx>({ theme: "dark", setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useTheme();
  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}

export function useThemeCtx() {
  return useContext(ThemeCtx);
}
