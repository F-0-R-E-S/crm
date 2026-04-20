"use client";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { WizardFormData } from "../wizard";

interface Props {
  value: WizardFormData;
  onBack: () => void;
}

export function Step5GoLive({ value, onBack }: Props) {
  const router = useRouter();
  const goLive = trpc.onboarding.goLive.useMutation();
  const complete = trpc.onboarding.complete.useMutation();
  const [busy, setBusy] = useState<"live" | "sandbox" | null>(null);
  const [err, setErr] = useState("");

  async function handleGoLive() {
    setBusy("live");
    setErr("");
    try {
      await goLive.mutateAsync();
      try {
        window.localStorage.removeItem("gambchamp:onboarding");
      } catch {
        // ignore
      }
      router.push("/dashboard?onboarded=1");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "go-live failed");
      setBusy(null);
    }
  }

  async function handleStaySandbox() {
    setBusy("sandbox");
    setErr("");
    try {
      await complete.mutateAsync();
      try {
        window.localStorage.removeItem("gambchamp:onboarding");
      } catch {
        // ignore
      }
      router.push("/dashboard?onboarded=1");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "complete failed");
      setBusy(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
          You're ready to go live
        </div>
        <div style={{ fontSize: 12, color: "var(--fg-2)" }}>
          Review your setup. Switching to production flips your API key off sandbox mode so real
          leads reach your broker.
        </div>
      </div>

      <div
        style={{
          border: "1px solid var(--bd-1)",
          borderRadius: 6,
          overflow: "hidden",
          background: "var(--bg-4)",
        }}
      >
        <SummaryRow label="Organization" value={String(value.orgName ?? "—")} />
        <SummaryRow
          label="First broker"
          value={String(value.brokerName ?? "—")}
          sub={String(value.endpointUrl ?? "")}
        />
        <SummaryRow
          label="First affiliate"
          value={String(value.affiliateName ?? "—")}
          sub={String(value.affiliateEmail ?? "")}
        />
        <SummaryRow
          label="First test lead"
          value={String(value.testLeadFinalState ?? "not sent")}
          sub={value.testLeadTraceId ? `trace_id: ${String(value.testLeadTraceId)}` : ""}
        />
      </div>

      {err && <div style={{ fontSize: 12, color: "oklch(72% 0.15 25)" }}>{err}</div>}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          paddingTop: 16,
          borderTop: "1px solid var(--bd-1)",
        }}
      >
        <button type="button" onClick={onBack} style={secondaryBtn(!!busy)}>
          ← back
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={handleStaySandbox}
            disabled={!!busy}
            style={secondaryBtn(!!busy)}
          >
            {busy === "sandbox" ? "Saving…" : "Keep in sandbox"}
          </button>
          <button type="button" onClick={handleGoLive} disabled={!!busy} style={primaryBtn(!!busy)}>
            {busy === "live" ? "Switching…" : "Switch to production"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        display: "flex",
        padding: "10px 14px",
        gap: 12,
        borderBottom: "1px solid var(--bd-1)",
      }}
    >
      <div style={{ width: 140, color: "var(--fg-2)", fontSize: 12 }}>{label}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13 }}>{value}</div>
        {sub && (
          <div
            style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--fg-2)", marginTop: 2 }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "9px 16px",
    background: "var(--fg-0)",
    color: "var(--bg-1)",
    border: "none",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
}
function secondaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "8px 14px",
    background: "transparent",
    color: "var(--fg-0)",
    border: "1px solid var(--bd-2)",
    borderRadius: 4,
    fontSize: 13,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
}
