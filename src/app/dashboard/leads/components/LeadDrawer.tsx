"use client";
import { CodeBlock, Pill, StatePill, TabStrip, btnStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { fmtRel } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

type Tab = "timeline" | "payload" | "broker" | "postbacks";

export function LeadDrawer({ leadId, onClose }: { leadId: string; onClose: () => void }) {
  const { theme } = useThemeCtx();
  const utils = trpc.useUtils();
  const q = trpc.lead.byId.useQuery({ id: leadId });
  const setState = trpc.lead.setState.useMutation({
    onSuccess: () => utils.lead.byId.invalidate({ id: leadId }),
  });
  const repush = trpc.lead.repush.useMutation({
    onSuccess: () => utils.lead.byId.invalidate({ id: leadId }),
  });
  const resend = trpc.lead.resendOutboundPostback.useMutation({
    onSuccess: () => utils.lead.byId.invalidate({ id: leadId }),
  });
  const [tab, setTab] = useState<Tab>("timeline");

  if (!q.data) return null;
  const lead = q.data;

  return (
    <aside
      style={{
        position: "fixed",
        right: 0,
        top: 46,
        bottom: 0,
        width: 540,
        background: theme === "dark" ? "var(--bg-1)" : "var(--bg-1)",
        borderLeft: "1px solid var(--bd-1)",
        display: "flex",
        flexDirection: "column",
        boxShadow:
          theme === "dark" ? "-12px 0 36px rgba(0,0,0,0.35)" : "-12px 0 36px rgba(0,0,0,0.10)",
        zIndex: 6,
      }}
    >
      <header style={{ padding: "14px 18px", borderBottom: "1px solid var(--bd-1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StatePill state={lead.state as never} />
          <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
            {fmtRel(new Date(lead.createdAt))}
          </span>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={onClose}
            style={{ ...btnStyle(theme), padding: "4px 10px" }}
          >
            esc ✕
          </button>
        </div>
        <div style={{ marginTop: 6, fontSize: 14, fontWeight: 500 }}>
          {lead.firstName} {lead.lastName}
        </div>
        <div
          style={{
            marginTop: 2,
            fontSize: 11,
            fontFamily: "var(--mono)",
            color: "var(--fg-2)",
            wordBreak: "break-all",
          }}
        >
          {lead.traceId}
        </div>
      </header>
      <div
        style={{
          padding: "10px 18px",
          borderBottom: "1px solid var(--bd-1)",
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => repush.mutate({ id: lead.id })}
          style={btnStyle(theme)}
        >
          re-push
        </button>
        <button
          type="button"
          onClick={() => setState.mutate({ id: lead.id, state: "FTD" })}
          style={btnStyle(theme)}
        >
          mark ftd
        </button>
        <button
          type="button"
          onClick={() => setState.mutate({ id: lead.id, state: "REJECTED", reason: "manual" })}
          style={btnStyle(theme)}
        >
          mark rejected
        </button>
        {lead.outboundPostbacks[0] && (
          <button
            type="button"
            onClick={() => resend.mutate({ outboundId: lead.outboundPostbacks[0].id })}
            style={btnStyle(theme)}
          >
            re-send postback
          </button>
        )}
      </div>
      <div style={{ padding: "0 18px", paddingTop: 12 }}>
        <TabStrip<Tab>
          tabs={[
            { key: "timeline", label: "timeline" },
            { key: "payload", label: "payload" },
            { key: "broker", label: "broker" },
            { key: "postbacks", label: "postbacks" },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "0 18px 18px" }}>
        {tab === "timeline" && (
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {lead.events.map((e) => (
              <li
                key={e.id}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "8px 0",
                  borderBottom: "1px solid var(--bd-1)",
                  fontSize: 12,
                }}
              >
                <span style={{ fontFamily: "var(--mono)", color: "var(--fg-2)", minWidth: 110 }}>
                  {new Date(e.createdAt).toLocaleTimeString()}
                </span>
                <span style={{ fontFamily: "var(--mono)", fontWeight: 500 }}>{e.kind}</span>
                <span style={{ color: "var(--fg-2)", fontSize: 11 }}>{JSON.stringify(e.meta)}</span>
              </li>
            ))}
          </ul>
        )}
        {tab === "payload" && (
          <CodeBlock
            label="intake payload"
            data={{
              geo: lead.geo,
              ip: lead.ip,
              firstName: lead.firstName,
              lastName: lead.lastName,
              email: lead.email,
              phone: lead.phone,
              subId: lead.subId,
              utm: lead.utm,
              eventTs: lead.eventTs,
              receivedAt: lead.receivedAt,
            }}
          />
        )}
        {tab === "broker" && (
          <div style={{ display: "grid", gap: 10 }}>
            <CodeBlock label="broker" data={lead.broker ?? { note: "not yet routed" }} />
            <div style={{ fontSize: 12, color: "var(--fg-2)" }}>
              last status:{" "}
              <Pill tone="info" size="xs">
                {lead.lastBrokerStatus ?? "—"}
              </Pill>
            </div>
          </div>
        )}
        {tab === "postbacks" && (
          <table style={{ width: "100%", fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--fg-2)", fontFamily: "var(--mono)" }}>
                <th>direction</th>
                <th>event</th>
                <th>status</th>
                <th>attempt</th>
                <th>when</th>
              </tr>
            </thead>
            <tbody>
              {lead.outboundPostbacks.map((o) => (
                <tr key={o.id} style={{ borderTop: "1px solid var(--bd-1)" }}>
                  <td style={{ padding: "6px 0" }}>OUT</td>
                  <td>{o.event}</td>
                  <td>
                    {o.httpStatus ?? "—"} {o.deliveredAt ? "✓" : "✗"}
                  </td>
                  <td>{o.attemptN}</td>
                  <td>{new Date(o.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </aside>
  );
}
