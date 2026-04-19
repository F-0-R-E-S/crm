"use client";
import { type LeadStateKey, stateToTone } from "@/lib/tokens";
import { Dot } from "./Dot";
import { Pill } from "./Pill";

interface StatePillProps {
  state: LeadStateKey;
  size?: "xs" | "sm";
}

export function StatePill({ state, size = "sm" }: StatePillProps) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <Dot state={state} />
      <Pill tone={stateToTone(state)} size={size}>
        {state}
      </Pill>
    </span>
  );
}
