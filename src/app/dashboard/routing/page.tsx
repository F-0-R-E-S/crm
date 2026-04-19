"use client";
import { Pill, btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function RoutingPage() {
  const { theme } = useThemeCtx();
  const utils = trpc.useUtils();
  const { data: byGeo } = trpc.rotation.listByGeo.useQuery();
  const brokers = trpc.broker.list.useQuery();
  const create = trpc.rotation.create.useMutation({
    onSuccess: () => utils.rotation.listByGeo.invalidate(),
  });
  const reorder = trpc.rotation.reorder.useMutation({
    onSuccess: () => utils.rotation.listByGeo.invalidate(),
  });
  const toggle = trpc.rotation.toggle.useMutation({
    onSuccess: () => utils.rotation.listByGeo.invalidate(),
  });
  const del = trpc.rotation.delete.useMutation({
    onSuccess: () => utils.rotation.listByGeo.invalidate(),
  });

  const geos = Object.keys(byGeo ?? {});
  const [selectedGeo, setSelectedGeo] = useState<string | null>(geos[0] ?? null);
  const [newGeo, setNewGeo] = useState("");
  const [newBrokerId, setNewBrokerId] = useState("");

  const rules = selectedGeo && byGeo ? (byGeo[selectedGeo] ?? []) : [];

  return (
    <div
      style={{
        padding: "20px 28px",
        height: "calc(100vh - 46px)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
        Routing
      </h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr",
          gap: 14,
          flex: 1,
          overflow: "hidden",
        }}
      >
        <aside style={{ border: "1px solid var(--bd-1)", borderRadius: 6, overflow: "auto" }}>
          <div
            style={{ padding: 12, borderBottom: "1px solid var(--bd-1)", display: "flex", gap: 6 }}
          >
            <input
              value={newGeo}
              onChange={(e) => setNewGeo(e.target.value.toUpperCase())}
              maxLength={2}
              placeholder="GEO"
              style={{ ...inputStyle(theme), width: 70 }}
            />
            <select
              value={newBrokerId}
              onChange={(e) => setNewBrokerId(e.target.value)}
              style={{ ...inputStyle(theme), flex: 1 }}
            >
              <option value="">broker…</option>
              {brokers.data?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              style={btnStyle(theme, "primary")}
              onClick={() => {
                if (!newGeo || !newBrokerId) return;
                const existing = byGeo?.[newGeo] ?? [];
                const priority = (existing[existing.length - 1]?.priority ?? 0) + 1;
                create.mutate({ geo: newGeo, brokerId: newBrokerId, priority });
                setNewGeo("");
                setNewBrokerId("");
              }}
            >
              +
            </button>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {geos.map((g) => {
              const count = (byGeo?.[g] ?? []).filter((r) => r.isActive).length;
              const active = g === selectedGeo;
              return (
                <li key={g}>
                  <button
                    type="button"
                    onClick={() => setSelectedGeo(g)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      background: active ? "var(--bg-3)" : "transparent",
                      padding: "10px 14px",
                      color: active ? "var(--fg-0)" : "var(--fg-1)",
                      fontSize: 13,
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      fontFamily: "var(--mono)",
                    }}
                  >
                    <span>{g}</span>
                    <span style={{ color: "var(--fg-2)" }}>{count} active</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
        <section style={{ border: "1px solid var(--bd-1)", borderRadius: 6, overflow: "auto" }}>
          {!selectedGeo && (
            <div style={{ padding: 28, color: "var(--fg-2)" }}>
              Select a geo to see its broker pool.
            </div>
          )}
          {selectedGeo && (
            <>
              <header
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--bd-1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  pool for <span style={{ fontFamily: "var(--mono)" }}>{selectedGeo}</span>
                </div>
                <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
                  lower priority = tried first
                </span>
              </header>
              <table style={{ width: "100%", fontSize: 12 }}>
                <thead>
                  <tr
                    style={{
                      textAlign: "left",
                      color: "var(--fg-2)",
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    <th style={{ padding: "10px 18px" }}>priority</th>
                    <th>broker</th>
                    <th>on/off</th>
                    <th>actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id} style={{ borderTop: "1px solid var(--bd-1)" }}>
                      <td
                        style={{ padding: "10px 18px", fontFamily: "var(--mono)", fontWeight: 600 }}
                      >
                        {r.priority}
                      </td>
                      <td>
                        {r.broker.name}{" "}
                        {!r.broker.isActive && (
                          <Pill tone="warn" size="xs">
                            broker off
                          </Pill>
                        )}
                      </td>
                      <td>
                        <Pill tone={r.isActive ? "success" : "neutral"} size="xs">
                          <input
                            type="checkbox"
                            checked={r.isActive}
                            onChange={(e) =>
                              toggle.mutate({ id: r.id, isActive: e.target.checked })
                            }
                            style={{ marginRight: 6 }}
                          />
                          {r.isActive ? "on" : "off"}
                        </Pill>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => reorder.mutate({ id: r.id, direction: "up" })}
                          style={btnStyle(theme)}
                        >
                          ↑
                        </button>{" "}
                        <button
                          type="button"
                          onClick={() => reorder.mutate({ id: r.id, direction: "down" })}
                          style={btnStyle(theme)}
                        >
                          ↓
                        </button>{" "}
                        <button
                          type="button"
                          onClick={() => del.mutate({ id: r.id })}
                          style={{ ...btnStyle(theme), color: "oklch(72% 0.15 25)" }}
                        >
                          del
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <footer
                style={{
                  padding: "14px 18px",
                  borderTop: "1px solid var(--bd-1)",
                  background: "var(--bg-2)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "var(--mono)",
                    color: "var(--fg-2)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  decision flow
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <code style={{ fontFamily: "var(--mono)" }}>lead.geo={selectedGeo}</code>
                  {rules
                    .filter((r) => r.isActive)
                    .map((r) => (
                      <span key={r.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        →
                        <Pill tone="info" size="xs">
                          p{r.priority} · {r.broker.name}
                        </Pill>
                        <span style={{ color: "var(--fg-2)", fontSize: 10 }}>fail?</span>
                      </span>
                    ))}
                  →{" "}
                  <Pill tone="danger" size="xs">
                    no_broker_available
                  </Pill>
                </div>
              </footer>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
