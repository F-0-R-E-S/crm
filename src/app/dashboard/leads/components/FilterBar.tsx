"use client";
import { Select, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";

export interface Filters {
  search: string;
  state: string;
  geo: string;
  affiliateId: string;
  brokerId: string;
}

interface Props {
  filters: Filters;
  onChange: (next: Partial<Filters>) => void;
  total?: number;
  showing?: number;
  onExport?: () => void;
}

const STATES = [
  "NEW",
  "VALIDATING",
  "REJECTED",
  "PUSHING",
  "PUSHED",
  "ACCEPTED",
  "DECLINED",
  "FTD",
  "FAILED",
];

export function FilterBar({ filters, onChange, total, showing, onExport }: Props) {
  const { theme } = useThemeCtx();
  const aff = trpc.affiliate.list.useQuery();
  const brk = trpc.broker.list.useQuery();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 28px",
        borderBottom: "1px solid var(--bd-1)",
        position: "sticky",
        top: 0,
        background: "var(--bg-0)",
        zIndex: 2,
      }}
    >
      <input
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
        placeholder="trace_id / email / phone / name"
        style={{ ...inputStyle(theme), width: 280 }}
      />
      <Select
        value={filters.state}
        onChange={(v) => onChange({ state: v })}
        options={[{ v: "", l: "any state" }, ...STATES.map((s) => ({ v: s, l: s }))]}
        width={130}
      />
      <Select
        value={filters.geo}
        onChange={(v) => onChange({ geo: v.toUpperCase() })}
        options={[{ v: "", l: "any geo" }]}
        width={100}
      />
      <Select
        value={filters.affiliateId}
        onChange={(v) => onChange({ affiliateId: v })}
        options={[
          { v: "", l: "any affiliate" },
          ...(aff.data ?? []).map((a) => ({ v: a.id, l: a.name })),
        ]}
        width={160}
      />
      <Select
        value={filters.brokerId}
        onChange={(v) => onChange({ brokerId: v })}
        options={[
          { v: "", l: "any broker" },
          ...(brk.data ?? []).map((b) => ({ v: b.id, l: b.name })),
        ]}
        width={140}
      />
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
        {showing ?? 0} / {total ?? 0} leads
      </span>
      <button
        type="button"
        onClick={onExport}
        style={{
          padding: "6px 10px",
          fontSize: 11,
          fontFamily: "var(--mono)",
          background: "transparent",
          border: "1px solid var(--bd-2)",
          borderRadius: 4,
          color: "var(--fg-0)",
          cursor: "pointer",
        }}
      >
        export csv
      </button>
    </div>
  );
}
