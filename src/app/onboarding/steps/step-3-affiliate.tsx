"use client";
import type { WizardFormData } from "../wizard";

interface Props {
  value: WizardFormData;
  onNext: (payload: WizardFormData) => void | Promise<void>;
  onBack: () => void;
}

export function Step3Affiliate({ onNext, onBack }: Props) {
  return (
    <div style={{ fontSize: 13 }}>
      Affiliate + API key — implemented in Task 7.
      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <button type="button" onClick={onBack}>
          ← back
        </button>
        <button type="button" onClick={() => onNext({})}>
          Next (stub) →
        </button>
      </div>
    </div>
  );
}
