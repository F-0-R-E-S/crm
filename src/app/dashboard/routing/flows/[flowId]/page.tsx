"use client";
import { CodeBlock, Pill, btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { use, useEffect, useState } from "react";

// Runtime cap status (from REST /api/v1/routing/caps/:flowId)
type Cap = {
  scope: string;
  scope_ref_id: string;
  window: string;
  limit: number;
  used: number;
  remaining: number;
  resets_at: string;
};

// Editable country→limit row
type CountryLimitRow = {
  _uid: number; // stable React key
  country: string;
  limit: string; // kept as string for input; parsed on save
};

// Editable cap definition row
type CapDefRow = {
  _uid: number; // stable React key
  scope: "AFFILIATE" | "BROKER" | "FLOW" | "BRANCH" | "TARGET";
  scopeRefId: string;
  window: "HOURLY" | "DAILY" | "WEEKLY";
  limit: string; // kept as string for input
  timezone: string;
  perCountry: boolean;
  countryLimits: CountryLimitRow[];
};

let _nextUid = 1;
function nextUid() {
  return _nextUid++;
}

function makeEmptyCapDef(): CapDefRow {
  return {
    _uid: nextUid(),
    scope: "FLOW",
    scopeRefId: "",
    window: "DAILY",
    limit: "0",
    timezone: "UTC",
    perCountry: false,
    countryLimits: [],
  };
}

function statusTone(s: string) {
  if (s === "PUBLISHED") return "success" as const;
  if (s === "ARCHIVED") return "neutral" as const;
  return "warn" as const;
}

function capRowsFromServer(
  defs: Array<{
    scope: string;
    scopeRefId: string;
    window: string;
    limit: number;
    timezone: string;
    perCountry: boolean;
    countryLimits: Array<{ country: string; limit: number }>;
  }>,
): CapDefRow[] {
  return defs.map((d) => ({
    _uid: nextUid(),
    scope: d.scope as CapDefRow["scope"],
    scopeRefId: d.scopeRefId,
    window: d.window as CapDefRow["window"],
    limit: String(d.limit),
    timezone: d.timezone,
    perCountry: d.perCountry,
    countryLimits: d.countryLimits.map((cl) => ({
      _uid: nextUid(),
      country: cl.country,
      limit: String(cl.limit),
    })),
  }));
}

/** Returns true if there is at least one invalid per-country cap (perCountry=true with zero rows) */
function hasPerCountryError(rows: CapDefRow[]): boolean {
  return rows.some((r) => r.perCountry && r.countryLimits.length === 0);
}

export default function FlowDetailPage({ params }: { params: Promise<{ flowId: string }> }) {
  const { flowId } = use(params);
  const { theme } = useThemeCtx();
  const utils = trpc.useUtils();
  const { data: flow, isLoading } = trpc.routing.byId.useQuery({ id: flowId });
  const publish = trpc.routing.publish.useMutation({
    onSuccess: () => utils.routing.byId.invalidate({ id: flowId }),
  });
  const archive = trpc.routing.archive.useMutation({
    onSuccess: () => utils.routing.byId.invalidate({ id: flowId }),
  });

  // Runtime cap status (REST)
  const [caps, setCaps] = useState<Cap[]>([]);
  const [capsErr, setCapsErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/v1/routing/caps/${flowId}`)
      .then(async (r) => {
        if (!r.ok) {
          setCapsErr((await r.json()).error?.code ?? "unknown");
          return;
        }
        const body = await r.json();
        setCaps(body.caps ?? []);
      })
      .catch((e) => setCapsErr(e.message));
  }, [flowId]);

  // Cap definitions editor (tRPC)
  const { data: capDefs, isLoading: capDefsLoading } = trpc.routing.listCaps.useQuery({ flowId });
  const [capRows, setCapRows] = useState<CapDefRow[]>([]);
  const [capsSaveErr, setCapsSaveErr] = useState<string | null>(null);
  const [capsSaveOk, setCapsSaveOk] = useState(false);

  // Sync server data → local edit state (on initial load only)
  useEffect(() => {
    if (capDefs) {
      setCapRows(capRowsFromServer(capDefs));
    }
  }, [capDefs]);

  const updateCaps = trpc.routing.updateCaps.useMutation({
    onSuccess: (saved) => {
      setCapRows(capRowsFromServer(saved));
      setCapsSaveErr(null);
      setCapsSaveOk(true);
      setTimeout(() => setCapsSaveOk(false), 2000);
      utils.routing.listCaps.invalidate({ flowId });
    },
    onError: (e) => {
      setCapsSaveErr(e.message);
      setCapsSaveOk(false);
    },
  });

  function handleSaveCaps() {
    setCapsSaveErr(null);
    setCapsSaveOk(false);
    const parsed = capRows.map((r) => ({
      scope: r.scope,
      scopeRefId: r.scopeRefId,
      window: r.window,
      limit: Math.max(0, Number.parseInt(r.limit, 10) || 0),
      timezone: r.timezone || "UTC",
      perCountry: r.perCountry,
      countryLimits: r.countryLimits.map((cl) => ({
        country: cl.country.toUpperCase().slice(0, 2),
        limit: Math.max(1, Number.parseInt(cl.limit, 10) || 1),
      })),
    }));
    updateCaps.mutate({ flowId, caps: parsed });
  }

  // -- cap row helpers --
  function addCapRow() {
    setCapRows((prev) => [...prev, makeEmptyCapDef()]);
  }
  function removeCapRow(idx: number) {
    setCapRows((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateCapRow(idx: number, patch: Partial<CapDefRow>) {
    setCapRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  // -- country limit helpers --
  function addCountryLimit(capIdx: number) {
    setCapRows((prev) =>
      prev.map((r, i) =>
        i === capIdx
          ? {
              ...r,
              countryLimits: [...r.countryLimits, { _uid: nextUid(), country: "", limit: "1" }],
            }
          : r,
      ),
    );
  }
  function removeCountryLimit(capIdx: number, clIdx: number) {
    setCapRows((prev) =>
      prev.map((r, i) =>
        i === capIdx ? { ...r, countryLimits: r.countryLimits.filter((_, j) => j !== clIdx) } : r,
      ),
    );
  }
  function updateCountryLimit(capIdx: number, clIdx: number, patch: Partial<CountryLimitRow>) {
    setCapRows((prev) =>
      prev.map((r, i) =>
        i === capIdx
          ? {
              ...r,
              countryLimits: r.countryLimits.map((cl, j) =>
                j === clIdx ? { ...cl, ...patch } : cl,
              ),
            }
          : r,
      ),
    );
  }

  const isDraft = flow?.status === "DRAFT";
  const perCountryError = hasPerCountryError(capRows);
  const canSave = isDraft && !perCountryError && !updateCaps.isPending;

  if (isLoading) return <div style={{ padding: 28 }}>Loading…</div>;
  if (!flow) return <div style={{ padding: 28 }}>Flow not found.</div>;

  return (
    <div style={{ padding: "20px 28px", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
          {flow.name}
        </h1>
        <Pill tone={statusTone(flow.status)} size="xs">
          {flow.status.toLowerCase()}
        </Pill>
        <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
          {flow.id.slice(0, 10)}
        </span>
        <Link
          href={"/dashboard/routing/flows" as never}
          style={{ fontSize: 11, color: "var(--fg-2)", textDecoration: "none" }}
        >
          ← all flows
        </Link>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <Link
            href={`/dashboard/routing/flows/${flowId}/simulator` as never}
            style={{ ...btnStyle(theme), textDecoration: "none" }}
          >
            Simulator
          </Link>
          {flow.status === "DRAFT" && (
            <button
              type="button"
              style={btnStyle(theme, "primary")}
              disabled={publish.isPending}
              onClick={() => publish.mutate({ id: flowId })}
            >
              {publish.isPending ? "Publishing…" : "Publish"}
            </button>
          )}
          {flow.status === "PUBLISHED" && (
            <button
              type="button"
              style={btnStyle(theme)}
              disabled={archive.isPending}
              onClick={() => archive.mutate({ id: flowId })}
            >
              {archive.isPending ? "Archiving…" : "Archive"}
            </button>
          )}
        </div>
      </div>

      {publish.error && (
        <div
          style={{
            border: "1px solid oklch(60% 0.15 25)",
            borderRadius: 6,
            padding: 10,
            marginBottom: 12,
            fontSize: 12,
            color: "oklch(72% 0.15 25)",
          }}
        >
          Publish failed: {publish.error.message}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Flow meta + graph */}
        <section style={{ border: "1px solid var(--bd-1)", borderRadius: 6, overflow: "hidden" }}>
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--bd-1)",
              background: "var(--bg-2)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Flow configuration
          </div>
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <Meta label="Timezone" value={flow.timezone} mono />
            <Meta label="Versions" value={String(flow.versions?.length ?? 0)} mono />
            <Meta
              label="Active version"
              value={flow.activeVersionId ? flow.activeVersionId.slice(0, 12) : "—"}
              mono
            />
            <Meta label="Created at" value={new Date(flow.createdAt).toLocaleString()} mono />
            <Meta label="Updated at" value={new Date(flow.updatedAt).toLocaleString()} mono />
          </div>
        </section>

        {/* Active version details */}
        <section style={{ border: "1px solid var(--bd-1)", borderRadius: 6, overflow: "hidden" }}>
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--bd-1)",
              background: "var(--bg-2)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Active version
          </div>
          <div style={{ padding: 14 }}>
            {flow.activeVersion ? (
              <>
                <div style={{ fontSize: 12, color: "var(--fg-2)", marginBottom: 8 }}>
                  version #{flow.activeVersion.versionNumber} published{" "}
                  {flow.activeVersion.publishedAt
                    ? new Date(flow.activeVersion.publishedAt).toLocaleString()
                    : "—"}
                </div>
                <CodeBlock label="graph" data={flow.activeVersion.graph} />
              </>
            ) : (
              <div style={{ color: "var(--fg-2)" }}>No active version (flow is in DRAFT).</div>
            )}
          </div>
        </section>
      </div>

      {/* Cap definitions editor */}
      <section
        style={{
          border: "1px solid var(--bd-1)",
          borderRadius: 6,
          overflow: "hidden",
          marginTop: 16,
        }}
      >
        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid var(--bd-1)",
            background: "var(--bg-2)",
            fontSize: 13,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>Cap definitions</span>
          {!isDraft && (
            <span style={{ fontSize: 11, color: "var(--fg-2)", fontWeight: 400 }}>
              read-only — flow is {flow.status.toLowerCase()}
            </span>
          )}
        </div>

        <div style={{ padding: 14 }}>
          {capDefsLoading ? (
            <div style={{ color: "var(--fg-2)", fontSize: 12 }}>Loading…</div>
          ) : (
            <>
              {capRows.length === 0 && (
                <div style={{ color: "var(--fg-2)", fontSize: 12, marginBottom: 10 }}>
                  No cap definitions.
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {capRows.map((row, idx) => (
                  <CapDefEditor
                    key={row._uid}
                    row={row}
                    idx={idx}
                    theme={theme}
                    readOnly={!isDraft}
                    onChange={(patch) => updateCapRow(idx, patch)}
                    onRemove={() => removeCapRow(idx)}
                    onAddCountry={() => addCountryLimit(idx)}
                    onRemoveCountry={(clIdx) => removeCountryLimit(idx, clIdx)}
                    onChangeCountry={(clIdx, patch) => updateCountryLimit(idx, clIdx, patch)}
                  />
                ))}
              </div>

              {isDraft && (
                <button
                  type="button"
                  style={{ ...btnStyle(theme), marginTop: 10 }}
                  onClick={addCapRow}
                >
                  + Add cap
                </button>
              )}

              {perCountryError && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    color: "oklch(72% 0.15 25)",
                    border: "1px solid oklch(60% 0.15 25)",
                    borderRadius: 4,
                    padding: "6px 10px",
                  }}
                >
                  Per-country caps must have at least one country entry before saving.
                </div>
              )}

              {capsSaveErr && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    color: "oklch(72% 0.15 25)",
                    border: "1px solid oklch(60% 0.15 25)",
                    borderRadius: 4,
                    padding: "6px 10px",
                  }}
                >
                  Save failed: {capsSaveErr}
                </div>
              )}

              {capsSaveOk && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    color: "oklch(72% 0.15 130)",
                    padding: "6px 10px",
                  }}
                >
                  Saved.
                </div>
              )}

              {isDraft && (
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    style={btnStyle(theme, "primary")}
                    disabled={!canSave}
                    onClick={handleSaveCaps}
                  >
                    {updateCaps.isPending ? "Saving…" : "Save caps"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Runtime caps status panel */}
      <section
        style={{
          border: "1px solid var(--bd-1)",
          borderRadius: 6,
          overflow: "hidden",
          marginTop: 16,
        }}
      >
        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid var(--bd-1)",
            background: "var(--bg-2)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          Cap counters (live)
        </div>
        {capsErr && (
          <div style={{ padding: 14, color: "oklch(72% 0.15 25)", fontSize: 12 }}>
            caps error: {capsErr}
          </div>
        )}
        {!capsErr && caps.length === 0 && (
          <div style={{ padding: 14, color: "var(--fg-2)" }}>
            No cap counters on active version.
          </div>
        )}
        {caps.length > 0 && (
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
                <th style={{ padding: "8px 14px" }}>scope</th>
                <th>ref</th>
                <th>window</th>
                <th>used / limit</th>
                <th>remaining</th>
                <th>resets</th>
              </tr>
            </thead>
            <tbody>
              {caps.map((c, i) => (
                <tr
                  key={`${c.scope}-${c.scope_ref_id}-${i}`}
                  style={{ borderTop: "1px solid var(--bd-1)" }}
                >
                  <td style={{ padding: "8px 14px" }}>
                    <Pill size="xs">{c.scope}</Pill>
                  </td>
                  <td style={{ fontFamily: "var(--mono)", fontSize: 10 }}>
                    {c.scope_ref_id.slice(0, 10)}
                  </td>
                  <td style={{ fontFamily: "var(--mono)" }}>{c.window.toLowerCase()}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>
                    {c.used} / {c.limit}
                  </td>
                  <td
                    style={{
                      fontFamily: "var(--mono)",
                      color: c.remaining === 0 ? "oklch(72% 0.15 25)" : "var(--fg-0)",
                    }}
                  >
                    {c.remaining}
                  </td>
                  <td style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-2)" }}>
                    {new Date(c.resets_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CapDefEditor — renders a single editable cap definition row
// ---------------------------------------------------------------------------

type Theme = "dark" | "light";

function CapDefEditor({
  row,
  idx,
  theme,
  readOnly,
  onChange,
  onRemove,
  onAddCountry,
  onRemoveCountry,
  onChangeCountry,
}: {
  row: CapDefRow;
  idx: number;
  theme: Theme;
  readOnly: boolean;
  onChange: (patch: Partial<CapDefRow>) => void;
  onRemove: () => void;
  onAddCountry: () => void;
  onRemoveCountry: (clIdx: number) => void;
  onChangeCountry: (clIdx: number, patch: Partial<CountryLimitRow>) => void;
}) {
  const inp = inputStyle(theme);
  const rowStyle: React.CSSProperties = {
    border: "1px solid var(--bd-1)",
    borderRadius: 6,
    padding: 12,
    background: "var(--bg-2)",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    color: "var(--fg-2)",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    marginBottom: 3,
    display: "block",
  };
  const fieldWrap: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
  };

  return (
    <div style={rowStyle}>
      {/* Top row: fields + remove */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        {/* Scope */}
        <div style={fieldWrap}>
          <label style={labelStyle} htmlFor={`cap-scope-${idx}`}>
            Scope
          </label>
          <select
            id={`cap-scope-${idx}`}
            disabled={readOnly}
            value={row.scope}
            onChange={(e) => onChange({ scope: e.target.value as CapDefRow["scope"] })}
            style={{ ...inp, appearance: "auto" }}
          >
            {(["AFFILIATE", "BROKER", "FLOW", "BRANCH", "TARGET"] as const).map((s) => (
              <option key={s} value={s}>
                {s.toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Scope ref ID */}
        <div style={fieldWrap}>
          <label style={labelStyle} htmlFor={`cap-ref-${idx}`}>
            Scope ref ID
          </label>
          <input
            id={`cap-ref-${idx}`}
            disabled={readOnly}
            value={row.scopeRefId}
            onChange={(e) => onChange({ scopeRefId: e.target.value })}
            placeholder="e.g. broker-uuid"
            style={{ ...inp, width: 180 }}
          />
        </div>

        {/* Window */}
        <div style={fieldWrap}>
          <label style={labelStyle} htmlFor={`cap-window-${idx}`}>
            Window
          </label>
          <select
            id={`cap-window-${idx}`}
            disabled={readOnly}
            value={row.window}
            onChange={(e) => onChange({ window: e.target.value as CapDefRow["window"] })}
            style={{ ...inp, appearance: "auto" }}
          >
            {(["HOURLY", "DAILY", "WEEKLY"] as const).map((w) => (
              <option key={w} value={w}>
                {w.toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Limit */}
        <div style={fieldWrap}>
          <label style={labelStyle} htmlFor={`cap-limit-${idx}`}>
            Limit
          </label>
          <input
            id={`cap-limit-${idx}`}
            type="number"
            min={0}
            disabled={readOnly}
            value={row.limit}
            onChange={(e) => onChange({ limit: e.target.value })}
            style={{ ...inp, width: 80 }}
          />
        </div>

        {/* Timezone */}
        <div style={fieldWrap}>
          <label style={labelStyle} htmlFor={`cap-tz-${idx}`}>
            Timezone
          </label>
          <input
            id={`cap-tz-${idx}`}
            disabled={readOnly}
            value={row.timezone}
            onChange={(e) => onChange({ timezone: e.target.value })}
            placeholder="UTC"
            style={{ ...inp, width: 130 }}
          />
        </div>

        {/* Per country toggle */}
        <div style={{ ...fieldWrap, justifyContent: "center" }}>
          <label style={labelStyle} htmlFor={`cap-percountry-${idx}`}>
            Per country
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: readOnly ? "default" : "pointer",
              fontSize: 12,
              fontFamily: "var(--sans)",
              paddingTop: 4,
            }}
          >
            <input
              id={`cap-percountry-${idx}`}
              type="checkbox"
              disabled={readOnly}
              checked={row.perCountry}
              onChange={(e) => onChange({ perCountry: e.target.checked })}
              style={{ width: 14, height: 14 }}
            />
            <span style={{ color: row.perCountry ? "var(--fg-0)" : "var(--fg-2)" }}>
              {row.perCountry ? "on" : "off"}
            </span>
          </label>
        </div>

        {/* Remove cap */}
        {!readOnly && (
          <div style={{ marginLeft: "auto" }}>
            <button
              type="button"
              onClick={onRemove}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--fg-2)",
                cursor: "pointer",
                fontSize: 16,
                padding: "2px 6px",
                lineHeight: 1,
              }}
              title="Remove cap"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Per-country limits sub-editor */}
      {row.perCountry && (
        <div
          style={{
            marginTop: 12,
            borderTop: "1px solid var(--bd-1)",
            paddingTop: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "var(--fg-2)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Country limits
          </div>

          {row.countryLimits.length === 0 && (
            <div
              style={{
                fontSize: 12,
                color: "oklch(72% 0.15 25)",
                marginBottom: 8,
              }}
            >
              Add at least one country entry.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {row.countryLimits.map((cl, clIdx) => (
              <div key={cl._uid} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  disabled={readOnly}
                  value={cl.country}
                  maxLength={2}
                  placeholder="CC"
                  onChange={(e) =>
                    onChangeCountry(clIdx, { country: e.target.value.toUpperCase().slice(0, 2) })
                  }
                  style={{
                    ...inp,
                    width: 48,
                    textTransform: "uppercase",
                    textAlign: "center",
                    letterSpacing: "0.1em",
                  }}
                />
                <input
                  type="number"
                  min={1}
                  disabled={readOnly}
                  value={cl.limit}
                  onChange={(e) => onChangeCountry(clIdx, { limit: e.target.value })}
                  style={{ ...inp, width: 80 }}
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => onRemoveCountry(clIdx)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--fg-2)",
                      cursor: "pointer",
                      fontSize: 15,
                      padding: "2px 4px",
                      lineHeight: 1,
                    }}
                    title="Remove country"
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
              style={{ ...btnStyle(theme), marginTop: 8, fontSize: 11 }}
              onClick={onAddCountry}
            >
              + Add country
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
      <span style={{ color: "var(--fg-2)" }}>{label}</span>
      <span style={{ fontFamily: mono ? "var(--mono)" : "inherit", color: "var(--fg-0)" }}>
        {value}
      </span>
    </div>
  );
}
