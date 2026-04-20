"use client";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import type { WizardFormData } from "../wizard";

interface Props {
  value: WizardFormData;
  onNext: (payload: WizardFormData) => void | Promise<void>;
  onBack: () => void;
}

export function Step3Affiliate({ value, onNext, onBack }: Props) {
  const createAffiliate = trpc.onboarding.createAffiliateWithKey.useMutation();

  const [name, setName] = useState<string>((value.affiliateName as string | undefined) ?? "");
  const [email, setEmail] = useState<string>((value.affiliateEmail as string | undefined) ?? "");
  const [plaintext, setPlaintext] = useState<string | null>(
    (value.plaintextKey as string | undefined) ?? null,
  );
  const [affiliateId, setAffiliateId] = useState<string | null>(
    (value.affiliateId as string | undefined) ?? null,
  );
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (name.trim().length < 2) {
      setErr("Name must be ≥ 2 chars");
      return;
    }
    try {
      const r = await createAffiliate.mutateAsync({ name: name.trim(), contactEmail: email });
      setPlaintext(r.plaintextKey);
      setAffiliateId(r.affiliateId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "create failed");
    }
  }

  async function copy() {
    if (!plaintext) return;
    await navigator.clipboard.writeText(plaintext);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function next() {
    if (!affiliateId || !plaintext) return;
    await onNext({
      affiliateId,
      affiliateName: name.trim(),
      affiliateEmail: email,
      apiKeyShown: true,
      // plaintextKey kept client-side only for Step 4; server strips it from stepData in saveStep
      plaintextKey: plaintext,
    });
  }

  if (!plaintext) {
    return (
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
            Create your first affiliate
          </div>
          <div style={{ fontSize: 12, color: "var(--fg-2)" }}>
            We'll generate an API key you can use to send test leads.
          </div>
        </div>
        <label style={labelStyle}>Affiliate name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={inputStyle}
          placeholder="Acme Affiliates"
        />
        <label style={labelStyle}>Contact email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
          placeholder="ops@acme.io"
        />
        {err && <div style={{ fontSize: 12, color: "oklch(72% 0.15 25)" }}>{err}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <button type="button" onClick={onBack} style={secondaryBtn(false)}>
            ← back
          </button>
          <button
            type="submit"
            disabled={createAffiliate.isPending}
            style={nextBtn(createAffiliate.isPending)}
          >
            {createAffiliate.isPending ? "Creating…" : "Create affiliate"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 15, fontWeight: 500 }}>Copy your API key</div>
      <div
        style={{
          background: "oklch(32% 0.06 80 / 0.2)",
          border: "1px solid oklch(60% 0.12 80)",
          borderRadius: 4,
          padding: 12,
          fontSize: 12,
          color: "oklch(82% 0.12 80)",
        }}
      >
        We'll never show this key again. Copy it somewhere safe.
      </div>
      <div
        style={{
          background: "var(--bg-4)",
          border: "1px solid var(--bd-2)",
          borderRadius: 4,
          padding: 14,
          fontFamily: "var(--mono)",
          fontSize: 14,
          wordBreak: "break-all",
        }}
      >
        {plaintext}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={copy} style={secondaryBtn(false)}>
          {copied ? "Copied!" : "Copy to clipboard"}
        </button>
      </div>
      <label style={{ display: "flex", gap: 8, fontSize: 12, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        I've copied the key somewhere safe.
      </label>
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
        <button type="button" onClick={next} disabled={!confirmed} style={nextBtn(!confirmed)}>
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
};
function nextBtn(disabled: boolean): React.CSSProperties {
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
