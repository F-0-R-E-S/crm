"use client";
import { trpc } from "@/lib/trpc";

export type FinanceFilters = {
  from: Date;
  to: Date;
  affiliateId?: string;
  brokerId?: string;
  geo?: string;
};

export function FinanceFilterBar({
  value,
  onChange,
}: {
  value: FinanceFilters;
  onChange: (v: FinanceFilters) => void;
}) {
  const affiliates = trpc.affiliate.list.useQuery();
  const brokers = trpc.broker.list.useQuery();

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-end",
        padding: "8px 16px",
        borderBottom: "1px solid var(--bd-1)",
        fontSize: 12,
      }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase" }}>from</span>
        <input
          type="date"
          value={fmt(value.from)}
          onChange={(e) => onChange({ ...value, from: new Date(e.target.value) })}
          style={{
            fontFamily: "var(--mono)",
            padding: "4px 6px",
            border: "1px solid var(--bd-1)",
            borderRadius: 3,
            background: "transparent",
            color: "var(--fg-0)",
          }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase" }}>to</span>
        <input
          type="date"
          value={fmt(value.to)}
          onChange={(e) => onChange({ ...value, to: new Date(e.target.value) })}
          style={{
            fontFamily: "var(--mono)",
            padding: "4px 6px",
            border: "1px solid var(--bd-1)",
            borderRadius: 3,
            background: "transparent",
            color: "var(--fg-0)",
          }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase" }}>affiliate</span>
        <select
          value={value.affiliateId ?? ""}
          onChange={(e) => onChange({ ...value, affiliateId: e.target.value || undefined })}
          style={{
            padding: "4px 6px",
            border: "1px solid var(--bd-1)",
            borderRadius: 3,
            background: "transparent",
            color: "var(--fg-0)",
          }}
        >
          <option value="">all</option>
          {affiliates.data?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase" }}>broker</span>
        <select
          value={value.brokerId ?? ""}
          onChange={(e) => onChange({ ...value, brokerId: e.target.value || undefined })}
          style={{
            padding: "4px 6px",
            border: "1px solid var(--bd-1)",
            borderRadius: 3,
            background: "transparent",
            color: "var(--fg-0)",
          }}
        >
          <option value="">all</option>
          {brokers.data?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase" }}>geo</span>
        <input
          type="text"
          maxLength={2}
          value={value.geo ?? ""}
          placeholder="US"
          onChange={(e) =>
            onChange({
              ...value,
              geo: e.target.value ? e.target.value.toUpperCase() : undefined,
            })
          }
          style={{
            fontFamily: "var(--mono)",
            width: 60,
            padding: "4px 6px",
            border: "1px solid var(--bd-1)",
            borderRadius: 3,
            background: "transparent",
            color: "var(--fg-0)",
          }}
        />
      </label>
    </div>
  );
}
