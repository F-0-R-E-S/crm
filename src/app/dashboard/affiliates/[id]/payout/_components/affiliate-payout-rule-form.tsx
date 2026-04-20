"use client";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

type Kind = "CPA_FIXED" | "CPA_CRG" | "REV_SHARE" | "HYBRID";

export function AffiliatePayoutRuleForm({
  affiliateId,
  onSaved,
}: {
  affiliateId: string;
  onSaved: () => void;
}) {
  const brokers = trpc.broker.list.useQuery();
  const [brokerId, setBrokerId] = useState<string>("");
  const [kind, setKind] = useState<Kind>("CPA_FIXED");
  const [cpaAmount, setCpaAmount] = useState("");
  const [crgRate, setCrgRate] = useState("");
  const [revShareRate, setRevShareRate] = useState("");
  const [activeFrom, setActiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [activeTo, setActiveTo] = useState("");

  const upsert = trpc.finance.upsertAffiliatePayoutRule.useMutation({ onSuccess: onSaved });

  const fieldStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "4px 8px",
    border: "1px solid var(--bd-1)",
    borderRadius: 3,
    background: "transparent",
    color: "var(--fg-0)",
    fontFamily: "var(--mono)",
    fontSize: 12,
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 10,
    textTransform: "uppercase",
    opacity: 0.6,
    marginBottom: 2,
  };

  return (
    <form
      style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}
      onSubmit={(e) => {
        e.preventDefault();
        upsert.mutate({
          affiliateId,
          brokerId: brokerId || null,
          kind,
          cpaAmount: cpaAmount || undefined,
          crgRate: crgRate || undefined,
          revShareRate: revShareRate || undefined,
          activeFrom: new Date(activeFrom),
          activeTo: activeTo ? new Date(activeTo) : undefined,
        });
      }}
    >
      <label>
        <span style={labelStyle}>Applies to broker</span>
        <select value={brokerId} onChange={(e) => setBrokerId(e.target.value)} style={fieldStyle}>
          <option value="">all brokers (global)</option>
          {brokers.data?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span style={labelStyle}>Kind</span>
        <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} style={fieldStyle}>
          <option value="CPA_FIXED">CPA (fixed)</option>
          <option value="CPA_CRG">CPA with CRG</option>
          <option value="REV_SHARE">Revenue share</option>
          <option value="HYBRID">Hybrid (CPA + rev share)</option>
        </select>
      </label>
      {(kind === "CPA_FIXED" || kind === "CPA_CRG" || kind === "HYBRID") && (
        <label>
          <span style={labelStyle}>CPA amount (USD)</span>
          <input
            type="number"
            step="0.01"
            value={cpaAmount}
            onChange={(e) => setCpaAmount(e.target.value)}
            style={fieldStyle}
          />
        </label>
      )}
      {kind === "CPA_CRG" && (
        <label>
          <span style={labelStyle}>Guaranteed FTD rate (0..1)</span>
          <input
            type="number"
            step="0.0001"
            min="0"
            max="1"
            value={crgRate}
            onChange={(e) => setCrgRate(e.target.value)}
            style={fieldStyle}
          />
        </label>
      )}
      {(kind === "REV_SHARE" || kind === "HYBRID") && (
        <label>
          <span style={labelStyle}>Revenue share (0..1)</span>
          <input
            type="number"
            step="0.0001"
            min="0"
            max="1"
            value={revShareRate}
            onChange={(e) => setRevShareRate(e.target.value)}
            style={fieldStyle}
          />
        </label>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label>
          <span style={labelStyle}>Active from</span>
          <input
            type="date"
            value={activeFrom}
            onChange={(e) => setActiveFrom(e.target.value)}
            style={fieldStyle}
          />
        </label>
        <label>
          <span style={labelStyle}>Active to (optional)</span>
          <input
            type="date"
            value={activeTo}
            onChange={(e) => setActiveTo(e.target.value)}
            style={fieldStyle}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={upsert.isPending}
        style={{
          padding: "6px 12px",
          background: "var(--fg-0)",
          color: "var(--bg-0)",
          border: "none",
          borderRadius: 3,
          cursor: "pointer",
          alignSelf: "flex-start",
        }}
      >
        {upsert.isPending ? "Saving…" : "Save rule"}
      </button>
    </form>
  );
}
