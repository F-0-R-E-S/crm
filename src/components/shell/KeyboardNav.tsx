"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { NAV_ITEMS } from "./NavConfig";

interface Props {
  onEscape?: () => void;
}

export function KeyboardNav({ onEscape }: Props) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT"
      )
        return;
      if (e.key === "Escape") {
        onEscape?.();
        return;
      }
      const item = NAV_ITEMS.find((n) => n.kbd && n.kbd.toLowerCase() === e.key.toLowerCase());
      if (item) router.push(item.path as never);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onEscape, router]);
  return null;
}
