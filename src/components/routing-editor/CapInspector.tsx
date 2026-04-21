"use client";
// CapInspector — scoped cap editor + live remaining display.
//
// When a BrokerPoolNode is selected, the inspector renders this: it shows
// every CapDefinition whose scope matches the broker (either BROKER with
// matching scopeRefId, or TARGET with matching scopeRefId) and also surfaces
// the live counter from /api/v1/routing/caps/:flowId so operators see
// used/limit at a glance.
//
// Inline edit mirrors the full-page CapDefEditor but scoped to a single
// target; add/remove rows feed back into the parent page's save buffer.

import { Pill } from "@/components/router-crm";

export type CapWindow = "HOURLY" | "DAILY" | "WEEKLY";
export type CapScope = "AFFILIATE" | "BROKER" | "FLOW" | "BRANCH" | "TARGET";

export interface CountryLimitRow {
  _uid: string;
  country: string;
  limit: string;
}

export interface CapDefRow {
  _uid: string;
  scope: CapScope;
  scopeRefId: string;
  window: CapWindow;
  limit: string;
  timezone: string;
  perCountry: boolean;
  countryLimits: CountryLimitRow[];
}

export interface LiveCap {
  scope: string;
  scope_ref_id: string;
  window: string;
  limit: number;
  used: number;
  remaining: number;
  resets_at: string;
}

interface Props {
  brokerId: string; // The broker the BrokerPoolNode points at
  rows: CapDefRow[];
  liveCaps: LiveCap[];
  readOnly?: boolean;
  onChange: (rows: CapDefRow[]) => void;
  onAdd: () => void;
  onRemove: (uid: string) => void;
}

const inp = {
  fontFamily: "var(--mono)",
  fontSize: 11,
  padding: "3px 6px",
  border: "1px solid var(--bd-1)",
  background: "var(--bg-1)",
  color: "var(--fg-0)",
  borderRadius: 3,
};

export function CapInspector({
  brokerId,
  rows,
  liveCaps,
  readOnly,
  onChange,
  onAdd,
  onRemove,
}: Props) {
  // Filter rows scoped to this broker.
  const scoped = rows.filter(
    (r) => (r.scope === "BROKER" || r.scope === "TARGET") && r.scopeRefId === brokerId,
  );
  const live = liveCaps.filter((c) => c.scope_ref_id === brokerId);

  const update = (uid: string, patch: Partial<CapDefRow>) => {
    onChange(rows.map((r) => (r._uid === uid ? { ...r, ...patch } : r)));
  };
  const updateCountry = (capUid: string, clUid: string, patch: Partial<CountryLimitRow>) => {
    onChange(
      rows.map((r) =>
        r._uid === capUid
          ? {
              ...r,
              countryLimits: r.countryLimits.map((cl) =>
                cl._uid === clUid ? { ...cl, ...patch } : cl,
              ),
            }
          : r,
      ),
    );
  };
  const addCountry = (capUid: string) => {
    onChange(
      rows.map((r) =>
        r._uid === capUid
          ? {
              ...r,
              countryLimits: [
                ...r.countryLimits,
                { _uid: crypto.randomUUID(), country: "", limit: "1" },
              ],
            }
          : r,
      ),
    );
  };
  const removeCountry = (capUid: string, clUid: string) => {
    onChange(
      rows.map((r) =>
        r._uid === capUid
          ? { ...r, countryLimits: r.countryLimits.filter((cl) => cl._uid !== clUid) }
          : r,
      ),
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Live counters */}
      {live.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 10,
              color: "var(--fg-2)",
              fontFamily: "var(--mono)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            remaining (live, refreshes every 30s)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {live.map((c, i) => (
              <div
                key={`${c.window}-${i}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 0",
                  borderBottom: "1px solid var(--bd-1)",
                }}
              >
                <Pill size="xs">{c.window}</Pill>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
                  {c.used} / {c.limit}
                </span>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    color: c.remaining === 0 ? "oklch(72% 0.15 25)" : "var(--fg-0)",
                    minWidth: 48,
                    textAlign: "right",
                  }}
                >
                  {c.remaining}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Definitions */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "var(--fg-2)",
              fontFamily: "var(--mono)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            definitions ({scoped.length})
          </span>
          {!readOnly && (
            <button
              type="button"
              onClick={onAdd}
              style={{
                fontSize: 11,
                padding: "3px 8px",
                border: "1px solid var(--bd-1)",
                background: "var(--bg-2)",
                color: "var(--fg-0)",
                borderRadius: 3,
                cursor: "pointer",
              }}
            >
              + cap
            </button>
          )}
        </div>
        {scoped.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--fg-2)" }}>No caps defined for this broker.</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {scoped.map((r) => (
            <div
              key={r._uid}
              style={{
                border: "1px solid var(--bd-1)",
                borderRadius: 4,
                padding: 8,
                background: "var(--bg-2)",
              }}
            >
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <select
                  disabled={readOnly}
                  value={r.window}
                  onChange={(e) => update(r._uid, { window: e.target.value as CapWindow })}
                  style={{ ...inp, appearance: "auto" }}
                >
                  {(["HOURLY", "DAILY", "WEEKLY"] as const).map((w) => (
                    <option key={w} value={w}>
                      {w.toLowerCase()}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  disabled={readOnly}
                  value={r.limit}
                  onChange={(e) => update(r._uid, { limit: e.target.value })}
                  style={{ ...inp, width: 80 }}
                />
                <input
                  disabled={readOnly}
                  value={r.timezone}
                  onChange={(e) => update(r._uid, { timezone: e.target.value })}
                  placeholder="UTC"
                  style={{ ...inp, width: 110 }}
                />
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    color: "var(--fg-2)",
                  }}
                >
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={r.perCountry}
                    onChange={(e) =>
                      update(r._uid, {
                        perCountry: e.target.checked,
                        countryLimits: e.target.checked ? r.countryLimits : [],
                      })
                    }
                  />
                  per-country
                </label>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => onRemove(r._uid)}
                    style={{
                      marginLeft: "auto",
                      background: "transparent",
                      border: "none",
                      color: "var(--fg-2)",
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                    aria-label="remove cap"
                  >
                    ×
                  </button>
                )}
              </div>
              {r.perCountry && (
                <div style={{ marginTop: 8, borderTop: "1px solid var(--bd-1)", paddingTop: 6 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {r.countryLimits.length === 0 && (
                      <span style={{ fontSize: 11, color: "oklch(72% 0.15 25)" }}>
                        add at least one country entry.
                      </span>
                    )}
                    {r.countryLimits.map((cl) => (
                      <div key={cl._uid} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          disabled={readOnly}
                          value={cl.country}
                          maxLength={2}
                          onChange={(e) =>
                            updateCountry(r._uid, cl._uid, {
                              country: e.target.value.toUpperCase().slice(0, 2),
                            })
                          }
                          style={{
                            ...inp,
                            width: 44,
                            textTransform: "uppercase",
                            textAlign: "center",
                          }}
                          placeholder="CC"
                        />
                        <input
                          type="number"
                          min={1}
                          disabled={readOnly}
                          value={cl.limit}
                          onChange={(e) =>
                            updateCountry(r._uid, cl._uid, { limit: e.target.value })
                          }
                          style={{ ...inp, width: 80 }}
                        />
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => removeCountry(r._uid, cl._uid)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--fg-2)",
                              cursor: "pointer",
                              fontSize: 13,
                            }}
                            aria-label="remove country row"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => addCountry(r._uid)}
                      style={{
                        marginTop: 4,
                        fontSize: 10,
                        padding: "2px 6px",
                        border: "1px solid var(--bd-1)",
                        background: "var(--bg-2)",
                        color: "var(--fg-1)",
                        borderRadius: 3,
                        cursor: "pointer",
                      }}
                    >
                      + country
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
