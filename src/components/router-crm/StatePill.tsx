"use client";
import { Dot } from "./Dot";
import { Pill } from "./Pill";
import { stateToTone, type LeadStateKey } from "@/lib/tokens";

interface StatePillProps {
  state: LeadStateKey;
  size?: "xs" | "sm";
}

export function StatePill({ state, size = "sm" }: StatePillProps) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <Dot state={state} />
      <Pill tone={stateToTone(state)} size={size}>{state}</Pill>
    </span>
  );
}
