"use client";
import { type Theme, useTheme } from "@/lib/use-theme";
import { type ReactNode, createContext, useContext } from "react";

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
