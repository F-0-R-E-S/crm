"use client";
// 7×24 schedule grid. Click-drag to toggle working-hour cells for a
// broker / branch predicate. Persists in the surrounding `acceptSchedule`
// JSON that the routing engine's schedule constraint consumes via
// `src/server/routing/constraints/schedule.ts`.
//
// Schedule shape (compact bitmask-per-day):
//   { tz: "Europe/Berlin", days: { 0: "000000000111111111111000", ... } }
// where each `days[n]` is 24 chars, '1' = accept, '0' = reject,
// indexed hour 0..23 in the configured tz (DST handled by engine).

import { useRef, useState } from "react";

export type ScheduleMap = Record<string, string>; // "0"..."6" → 24-char bitmask
export interface ScheduleValue {
  tz: string;
  days: ScheduleMap;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
// Static 0..23 hour list — used as a stable, non-index key source.
const HOURS = [
  "h00",
  "h01",
  "h02",
  "h03",
  "h04",
  "h05",
  "h06",
  "h07",
  "h08",
  "h09",
  "h10",
  "h11",
  "h12",
  "h13",
  "h14",
  "h15",
  "h16",
  "h17",
  "h18",
  "h19",
  "h20",
  "h21",
  "h22",
  "h23",
] as const;

function emptyDays(): ScheduleMap {
  const out: ScheduleMap = {};
  for (let d = 0; d < 7; d++) out[String(d)] = "0".repeat(24);
  return out;
}

export function normalizeSchedule(input?: Partial<ScheduleValue> | null): ScheduleValue {
  const days = emptyDays();
  if (input?.days) {
    for (const k of Object.keys(input.days)) {
      const v = input.days[k];
      if (typeof v === "string" && v.length === 24 && /^[01]+$/.test(v)) {
        days[k] = v;
      }
    }
  }
  return { tz: input?.tz ?? "UTC", days };
}

function setCell(mask: string, hour: number, on: boolean): string {
  const arr = mask.split("");
  arr[hour] = on ? "1" : "0";
  return arr.join("");
}

interface Props {
  value: ScheduleValue;
  onChange: (v: ScheduleValue) => void;
  readOnly?: boolean;
}

export function ScheduleGrid({ value, onChange, readOnly }: Props) {
  // Drag state — records the *intended value* for the drag so subsequent
  // enters re-apply the same toggle (mirror Google Calendar semantics).
  const dragging = useRef<{ mode: "set" | "clear" } | null>(null);
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);

  const toggleCell = (d: number, h: number, mode: "set" | "clear") => {
    if (readOnly) return;
    const key = String(d);
    const current = value.days[key] ?? "0".repeat(24);
    const next = setCell(current, h, mode === "set");
    onChange({ ...value, days: { ...value.days, [key]: next } });
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 8,
          fontSize: 11,
          color: "var(--fg-2)",
        }}
      >
        <label htmlFor="schedule-tz" style={{ fontFamily: "var(--mono)" }}>
          TZ
        </label>
        <input
          id="schedule-tz"
          disabled={readOnly}
          value={value.tz}
          onChange={(e) => onChange({ ...value, tz: e.target.value })}
          placeholder="UTC"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            padding: "2px 6px",
            border: "1px solid var(--bd-1)",
            background: "var(--bg-1)",
            color: "var(--fg-0)",
            borderRadius: 3,
            width: 160,
          }}
        />
        <span style={{ marginLeft: "auto" }}>click-drag to paint · right-click-drag to erase</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "42px repeat(24, minmax(0, 1fr))",
          gap: 1,
          fontFamily: "var(--mono)",
          fontSize: 9,
        }}
        onMouseUp={() => {
          dragging.current = null;
        }}
        onMouseLeave={() => {
          dragging.current = null;
          setHover(null);
        }}
      >
        {/* Column headers: 0..23 */}
        <span />
        {HOURS.map((key, h) => (
          <span
            key={key}
            style={{
              textAlign: "center",
              color: "var(--fg-2)",
              padding: "2px 0",
            }}
          >
            {h % 3 === 0 ? h : ""}
          </span>
        ))}

        {DAY_LABELS.map((label, d) => {
          const mask = value.days[String(d)] ?? "0".repeat(24);
          return (
            <div key={label} style={{ display: "contents" }}>
              <span
                style={{
                  color: "var(--fg-2)",
                  padding: "2px 6px 2px 0",
                  textAlign: "right",
                  alignSelf: "center",
                }}
              >
                {label}
              </span>
              {HOURS.map((hKey, h) => {
                const on = mask[h] === "1";
                const isHover = hover?.d === d && hover?.h === h;
                return (
                  <button
                    key={`${label}-${hKey}`}
                    type="button"
                    disabled={readOnly}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const mode: "set" | "clear" = on ? "clear" : "set";
                      dragging.current = { mode };
                      toggleCell(d, h, mode);
                    }}
                    onMouseEnter={() => {
                      setHover({ d, h });
                      if (dragging.current) toggleCell(d, h, dragging.current.mode);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      dragging.current = { mode: "clear" };
                      toggleCell(d, h, "clear");
                    }}
                    aria-label={`${label} ${h}:00 ${on ? "on" : "off"}`}
                    style={{
                      height: 22,
                      border: "1px solid var(--bd-1)",
                      background: on
                        ? "oklch(60% 0.15 150)"
                        : isHover
                          ? "var(--bg-3)"
                          : "var(--bg-1)",
                      borderRadius: 2,
                      cursor: readOnly ? "default" : "pointer",
                      padding: 0,
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
