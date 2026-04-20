"use client";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Step1Org } from "./steps/step-1-org";
import { Step2Broker } from "./steps/step-2-broker";
import { Step3Affiliate } from "./steps/step-3-affiliate";
import { Step4TestLead } from "./steps/step-4-test-lead";
import { Step5GoLive } from "./steps/step-5-go-live";

export type WizardFormData = Record<string, unknown>;
const LS_KEY = "gambchamp:onboarding";

export function OnboardingWizard() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: progress, isLoading } = trpc.onboarding.getProgress.useQuery();
  const saveStep = trpc.onboarding.saveStep.useMutation();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [formData, setFormData] = useState<WizardFormData>({});
  const [hydrated, setHydrated] = useState(false);

  // Rehydrate from localStorage first
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          if (parsed.currentStep) setCurrentStep(parsed.currentStep);
          if (parsed.formData) setFormData(parsed.formData);
        }
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Server wins on hydration
  useEffect(() => {
    if (!progress || !hydrated) return;
    setCurrentStep(Math.max(1, Math.min(5, progress.currentStep)) as 1 | 2 | 3 | 4 | 5);
    const serverData = (progress.stepData ?? {}) as WizardFormData;
    setFormData((prev) => ({ ...prev, ...serverData }));
  }, [progress, hydrated]);

  function persistLocal(step: number, data: WizardFormData) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify({ currentStep: step, formData: data }));
    } catch {
      // ignore
    }
  }

  async function goNext(payload: WizardFormData) {
    const next = Math.min(5, currentStep + 1) as 1 | 2 | 3 | 4 | 5;
    const merged = { ...formData, ...payload };
    setFormData(merged);
    setCurrentStep(next);
    persistLocal(next, merged);
    try {
      await saveStep.mutateAsync({ step: next, data: payload });
      utils.onboarding.getProgress.invalidate();
    } catch (e) {
      console.error("saveStep failed", e);
    }
  }

  function goBack() {
    const prev = Math.max(1, currentStep - 1) as 1 | 2 | 3 | 4 | 5;
    setCurrentStep(prev);
    persistLocal(prev, formData);
  }

  const stepLabels = useMemo(
    () => ["Organization", "Broker", "Affiliate + Key", "Test lead", "Go live"],
    [],
  );

  if (isLoading || !hydrated) {
    return (
      <div style={{ padding: 40, fontSize: 13, color: "var(--fg-2)" }}>loading onboarding…</div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 28px 80px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
          Set up your CRM
        </h1>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          style={{
            background: "transparent",
            color: "var(--fg-2)",
            border: "none",
            fontSize: 12,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Resume later →
        </button>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", gap: 8, margin: "24px 0 28px", alignItems: "center" }}>
        {stepLabels.map((lbl, i) => {
          const idx = i + 1;
          const active = idx === currentStep;
          const done = idx < currentStep;
          return (
            <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  border: "1px solid",
                  borderColor: active || done ? "var(--fg-0)" : "var(--bd-2)",
                  background: done ? "var(--fg-0)" : "transparent",
                  color: done ? "var(--bg-1)" : active ? "var(--fg-0)" : "var(--fg-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 500,
                  fontFamily: "var(--mono)",
                }}
              >
                {done ? "✓" : idx}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: active ? "var(--fg-0)" : "var(--fg-2)",
                }}
              >
                {lbl}
              </div>
              {idx < stepLabels.length && (
                <div
                  style={{
                    width: 24,
                    height: 1,
                    background: "var(--bd-2)",
                    marginLeft: 4,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step body */}
      <div
        style={{
          border: "1px solid var(--bd-1)",
          background: "var(--bg-1)",
          borderRadius: 8,
          padding: "24px 28px",
        }}
      >
        {currentStep === 1 && <Step1Org value={formData} onNext={goNext} />}
        {currentStep === 2 && <Step2Broker value={formData} onNext={goNext} onBack={goBack} />}
        {currentStep === 3 && <Step3Affiliate value={formData} onNext={goNext} onBack={goBack} />}
        {currentStep === 4 && <Step4TestLead value={formData} onNext={goNext} onBack={goBack} />}
        {currentStep === 5 && <Step5GoLive value={formData} onBack={goBack} />}
      </div>
    </div>
  );
}
