"use client";
import type { WizardFormData } from "../wizard";

interface Props {
  value: WizardFormData;
  onBack: () => void;
}

export function Step5GoLive({ onBack }: Props) {
  return (
    <div style={{ fontSize: 13 }}>
      Go live — implemented in Task 9.
      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <button type="button" onClick={onBack}>
          ← back
        </button>
      </div>
    </div>
  );
}
