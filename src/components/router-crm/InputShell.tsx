"use client";
import type { CSSProperties } from "react";
import type { Theme } from "@/lib/use-theme";

export function inputStyle(theme: Theme): CSSProperties {
  return {
    background: theme === "dark" ? "var(--bg-4)" : "#fff",
    color: "var(--fg-0)",
    border: `1px solid var(--bd-2)`,
    borderRadius: 4,
    padding: "6px 9px",
    fontSize: 12,
    fontFamily: "var(--mono)",
    outline: "none",
    transition: "border-color 120ms, background 120ms",
  };
}

export function btnStyle(theme: Theme, variant?: "primary"): CSSProperties {
  if (variant === "primary") {
    return {
      padding: "6px 12px",
      background: "var(--fg-0)",
      color: theme === "dark" ? "var(--bg-1)" : "#fff",
      border: "1px solid var(--fg-0)",
      borderRadius: 4,
      fontSize: 12,
      fontFamily: "var(--sans)",
      cursor: "pointer",
    };
  }
  return {
    padding: "6px 12px",
    background: "transparent",
    color: "var(--fg-0)",
    border: "1px solid var(--bd-2)",
    borderRadius: 4,
    fontSize: 12,
    fontFamily: "var(--sans)",
    cursor: "pointer",
  };
}
