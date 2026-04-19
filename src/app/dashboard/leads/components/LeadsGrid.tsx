"use client";
import type { RouterOutputs } from "@/lib/trpc";
import { StatePill } from "@/components/router-crm";
import { fmtTime, maskPhone } from "@/lib/format";
import { NewRowBadge } from "./NewRowBadge";
import { useThemeCtx } from "@/components/shell/ThemeProvider";

type Lead = RouterOutputs["lead"]["list"]["items"][number];

interface Props {
  leads: Lead[];
  selectedId?: string;
  onSelect: (lead: Lead) => void;
  newIds: Set<string>;
}

export function LeadsGrid({ leads, selectedId, onSelect, newIds }: Props) {
  const { theme } = useThemeCtx();
  const rowBd = theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const hoverBg = theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
  const selectedBg = theme === "dark" ? "rgba(120,180,230,0.08)" : "rgba(120,180,230,0.12)";

  return (
    <div style={{ padding: "0 28px" }}>
      <table style={{ width: "100%", fontSize: 12, fontVariantNumeric: "tabular-nums", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: 150 }} /><col style={{ width: 70 }} /><col style={{ width: 130 }} />
          <col style={{ width: 60 }} /><col style={{ width: 170 }} /><col style={{ width: 110 }} />
          <col style={{ width: 90 }} /><col style={{ width: 120 }} /><col />
        </colgroup>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--fg-2)", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: `1px solid ${rowBd}` }}>
            <th style={{ padding: "8px 4px" }}>trace_id</th><th>time</th><th>affiliate</th>
            <th>geo</th><th>phone</th><th>state</th>
            <th style={{ textAlign: "right" }}>push</th><th>broker</th><th>reason / status</th>
          </tr>
        </thead>
        <tbody>
          {leads.map(l => {
            const isNew = newIds.has(l.id);
            const sel = l.id === selectedId;
            return (
              <tr
                key={l.id}
                onClick={() => onSelect(l)}
                style={{
                  cursor: "pointer",
                  background: sel ? selectedBg : (isNew ? "rgba(120,210,150,0.06)" : "transparent"),
                  borderBottom: `1px solid ${rowBd}`,
                  position: "relative",
                  height: 32,
                }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = hoverBg; }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.background = isNew ? "rgba(120,210,150,0.06)" : "transparent"; }}
              >
                <td style={{ padding: "7px 4px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--fg-1)", position: "relative" }}>
                  <NewRowBadge active={isNew} />
                  {l.traceId.slice(0, 8)}…
                </td>
                <td style={{ fontFamily: "var(--mono)", color: "var(--fg-1)" }}>{fmtTime(new Date(l.createdAt))}</td>
                <td>{l.affiliate.name}</td>
                <td style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>{l.geo}</td>
                <td style={{ fontFamily: "var(--mono)", color: "var(--fg-1)" }}>{maskPhone(l.phone)}</td>
                <td><StatePill state={l.state as never} /></td>
                <td style={{ fontFamily: "var(--mono)", fontSize: 11, textAlign: "right", color: "var(--fg-2)" }}>
                  {l.lastPushAt ? "—" : "—"}
                </td>
                <td>{l.broker?.name ?? "—"}</td>
                <td style={{ color: "var(--fg-2)", fontSize: 11 }}>{l.rejectReason ?? l.lastBrokerStatus ?? ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
