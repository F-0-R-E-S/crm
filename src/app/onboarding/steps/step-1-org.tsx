"use client";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import type { WizardFormData } from "../wizard";

const CURRENCIES = ["USD", "EUR", "GBP", "UAH", "PLN"];

interface Props {
  value: WizardFormData;
  onNext: (payload: WizardFormData) => void | Promise<void>;
}

export function Step1Org({ value, onNext }: Props) {
  const { data: progress } = trpc.onboarding.getProgress.useQuery();
  const updateOrg = trpc.onboarding.updateOrg.useMutation();

  const org = progress?.org;
  const prefillName =
    (value.orgName as string | undefined) ?? org?.name ?? "";
  const prefillTz =
    (value.timezone as string | undefined) ??
    org?.timezone ??
    (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC");
  const prefillCcy = (value.currency as string | undefined) ?? org?.currency ?? "USD";

  const [name, setName] = useState(prefillName);
  const [timezone, setTimezone] = useState(prefillTz);
  const [currency, setCurrency] = useState(prefillCcy);
  const [tzList, setTzList] = useState<string[]>([]);
  const [err, setErr] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!name && org?.name) setName(org.name);
    if (org?.timezone && !value.timezone) setTimezone(org.timezone);
    if (org?.currency && !value.currency) setCurrency(org.currency);
  }, [org, name, value.timezone, value.currency]);

  useEffect(() => {
    try {
      const supported = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] })
        .supportedValuesOf;
      const tzs = supported?.("timeZone");
      if (tzs && tzs.length) setTzList(tzs);
      else setTzList(["UTC", "Europe/London", "Europe/Warsaw", "America/New_York", "Asia/Tokyo"]);
    } catch {
      setTzList(["UTC", "Europe/London", "Europe/Warsaw", "America/New_York", "Asia/Tokyo"]);
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (name.trim().length < 2 || name.length > 60) {
      setErr("Organization name must be 2–60 characters");
      return;
    }
    setBusy(true);
    try {
      await updateOrg.mutateAsync({ name: name.trim(), timezone, currency });
      await onNext({ orgName: name.trim(), timezone, currency });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Tell us about your org</div>
        <div style={{ fontSize: 12, color: "var(--fg-2)" }}>
          We use this to bucket leads, broker mappings, and billing timezone.
        </div>
      </div>

      <label style={labelStyle}>Organization name</label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        minLength={2}
        maxLength={60}
        style={inputStyle}
        placeholder="Acme Corp"
      />

      <label style={labelStyle}>Timezone</label>
      <select
        value={timezone}
        onChange={(e) => setTimezone(e.target.value)}
        style={inputStyle}
      >
        {tzList.map((tz) => (
          <option key={tz} value={tz}>
            {tz}
          </option>
        ))}
      </select>

      <label style={labelStyle}>Reporting currency</label>
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        style={inputStyle}
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {err && <div style={{ fontSize: 12, color: "oklch(72% 0.15 25)" }}>{err}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
        <button type="submit" disabled={busy} style={nextBtn(busy)}>
          {busy ? "Saving…" : "Next →"}
        </button>
      </div>
    </form>
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
};
function nextBtn(busy: boolean): React.CSSProperties {
  return {
    padding: "9px 16px",
    background: "var(--fg-0)",
    color: "var(--bg-1)",
    border: "none",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 500,
    cursor: busy ? "not-allowed" : "pointer",
    opacity: busy ? 0.6 : 1,
  };
}
