"use client";
import { useEffect, useRef, useState } from "react";
import type { WizardFormData } from "../wizard";

interface Props {
  value: WizardFormData;
  onNext: (payload: WizardFormData) => void | Promise<void>;
  onBack: () => void;
}

type TimelineState = "RECEIVED" | "VALIDATED" | "ROUTED" | "PUSHING" | "PUSHED";
type FinalState = "PUSHED" | "FAILED" | "REJECTED" | "ACCEPTED" | "FTD" | null;

export function Step4TestLead({ value, onNext, onBack }: Props) {
  const plaintext = value.plaintextKey as string | undefined;
  const [form, setForm] = useState({
    external_lead_id: `wizard-${Date.now()}`,
    first_name: "Wizard",
    last_name: "Tester",
    email: "wiz@t.io",
    phone: "+14155551212",
    country: "US",
  });
  const [sending, setSending] = useState(false);
  const [traceId, setTraceId] = useState<string | null>(null);
  const [reached, setReached] = useState<Record<TimelineState, boolean>>({
    RECEIVED: false,
    VALIDATED: false,
    ROUTED: false,
    PUSHING: false,
    PUSHED: false,
  });
  const [finalState, setFinalState] = useState<FinalState>(null);
  const [err, setErr] = useState<string>("");
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
  }, []);

  async function send() {
    if (!plaintext) {
      setErr("API key missing — go back and re-create the affiliate in Step 3.");
      return;
    }
    setErr("");
    setSending(true);
    setFinalState(null);
    setReached({ RECEIVED: false, VALIDATED: false, ROUTED: false, PUSHING: false, PUSHED: false });
    try {
      const resp = await fetch("/api/v1/leads?mode=sandbox", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${plaintext}`,
          "x-api-version": "2026-01",
        },
        body: JSON.stringify({
          external_lead_id: form.external_lead_id,
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          geo: form.country,
          ip: "8.8.8.8",
          event_ts: new Date().toISOString(),
        }),
      });
      const body = await resp.json();
      if (!resp.ok && resp.status !== 202) {
        setErr(body?.error?.message ?? `intake error ${resp.status}`);
        return;
      }
      // Sandbox path returns a synthetic response; mark the static stages immediately.
      setReached({
        RECEIVED: true,
        VALIDATED: true,
        ROUTED: true,
        PUSHING: true,
        PUSHED: body.status !== "rejected",
      });
      if (body.status === "rejected") {
        setFinalState("REJECTED");
      } else {
        setFinalState("PUSHED");
      }
      setTraceId(body.trace_id);

      // Also attempt to open SSE stream — may be empty for sandbox but documents the contract.
      try {
        const es = new EventSource(`/api/v1/onboarding/lead-stream/${body.trace_id}`);
        esRef.current = es;
        es.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data) as { state?: string };
            if (data.state) {
              setReached((prev) => ({ ...prev, [data.state as TimelineState]: true }));
              if (["PUSHED", "FAILED", "REJECTED", "ACCEPTED", "FTD"].includes(data.state)) {
                setFinalState(data.state as FinalState);
              }
            }
          } catch {
            // ignore
          }
        };
        es.addEventListener("done", () => {
          es.close();
        });
        es.onerror = () => {
          es.close();
        };
      } catch {
        // SSE is optional; sandbox already finalized the timeline
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "send failed");
    } finally {
      setSending(false);
    }
  }

  const stages: TimelineState[] = ["RECEIVED", "VALIDATED", "ROUTED", "PUSHING", "PUSHED"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Send a test lead</div>
        <div style={{ fontSize: 12, color: "var(--fg-2)" }}>
          We'll post this to your intake API using the key you just created.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {(
          [
            ["external_lead_id", "External ID"],
            ["country", "Country"],
            ["first_name", "First name"],
            ["last_name", "Last name"],
            ["email", "Email"],
            ["phone", "Phone"],
          ] as const
        ).map(([k, lbl]) => (
          <div key={k}>
            <label style={labelStyle}>{lbl}</label>
            <input
              type="text"
              value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              style={inputStyle}
            />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button type="button" onClick={send} disabled={sending || !plaintext} style={primaryBtn(sending || !plaintext)}>
          {sending ? "Sending…" : "Send test lead"}
        </button>
        {traceId && (
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--fg-2)", alignSelf: "center" }}>
            trace_id: {traceId}
          </span>
        )}
      </div>

      {err && <div style={{ fontSize: 12, color: "oklch(72% 0.15 25)" }}>{err}</div>}

      {/* Timeline */}
      {traceId && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
          {stages.map((s) => {
            const on = reached[s];
            return (
              <div
                key={s}
                style={{
                  padding: "6px 10px",
                  borderRadius: 4,
                  border: "1px solid",
                  borderColor: on ? "oklch(72% 0.15 145)" : "var(--bd-2)",
                  background: on ? "oklch(72% 0.15 145 / 0.12)" : "var(--bg-4)",
                  color: on ? "oklch(72% 0.15 145)" : "var(--fg-2)",
                  fontSize: 11,
                  fontFamily: "var(--mono)",
                }}
              >
                {on ? "✓" : "…"} {s}
              </div>
            );
          })}
        </div>
      )}

      {finalState && (
        <div
          style={{
            padding: 12,
            borderRadius: 4,
            background:
              finalState === "FAILED" || finalState === "REJECTED"
                ? "oklch(72% 0.15 25 / 0.1)"
                : "oklch(72% 0.15 145 / 0.1)",
            border: "1px solid",
            borderColor:
              finalState === "FAILED" || finalState === "REJECTED"
                ? "oklch(72% 0.15 25)"
                : "oklch(72% 0.15 145)",
            fontSize: 12,
          }}
        >
          {finalState === "FAILED" || finalState === "REJECTED"
            ? `Final state: ${finalState}. Your broker endpoint may be down — go back to Step 2 and re-run the health check. You can still proceed.`
            : `Success — final state: ${finalState}.`}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          paddingTop: 16,
          borderTop: "1px solid var(--bd-1)",
        }}
      >
        <button type="button" onClick={onBack} style={secondaryBtn(false)}>
          ← back
        </button>
        <button
          type="button"
          onClick={() => onNext({ testLeadTraceId: traceId, testLeadFinalState: finalState })}
          disabled={!finalState}
          style={nextBtn(!finalState)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11, color: "var(--fg-2)" };
const inputStyle: React.CSSProperties = {
  background: "var(--bg-4)",
  color: "var(--fg-0)",
  border: "1px solid var(--bd-2)",
  borderRadius: 4,
  padding: "8px 10px",
  fontSize: 13,
  outline: "none",
  width: "100%",
};
function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "8px 16px",
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
function nextBtn(disabled: boolean): React.CSSProperties {
  return primaryBtn(disabled);
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
