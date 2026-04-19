"use client";
import { btnStyle } from "@/components/router-crm";
import { trpc } from "@/lib/trpc";
import { useThemeCtx } from "./ThemeProvider";

export function Topbar() {
  const { theme, setTheme } = useThemeCtx();
  const bd = "var(--bd-1)";
  const fg = "var(--fg-1)";
  const bg = theme === "dark" ? "var(--bg-1)" : "var(--bg-0)";

  // Intake rate: count leads received in last 60 seconds
  const { data } = trpc.lead.counters.useQuery(undefined, { refetchInterval: 5000 });
  const rate = data?.leadsToday ?? 0; // placeholder; replace with 60-sec rolling count when query exists

  return (
    <header
      style={{
        height: 46,
        flexShrink: 0,
        borderBottom: `1px solid ${bd}`,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 20px",
        background: bg,
        position: "sticky",
        top: 0,
        zIndex: 5,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          className="pulse"
          style={{
            width: 7,
            height: 7,
            borderRadius: 7,
            background: "oklch(78% 0.14 150)",
            boxShadow: "0 0 8px oklch(78% 0.14 150)",
          }}
        />
        <span
          style={{ fontSize: 11, fontFamily: "var(--mono)", color: fg, letterSpacing: "0.04em" }}
        >
          intake live · {rate}/day
        </span>
      </div>
      <div style={{ flex: 1 }} />
      <button
        type="button"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        style={btnStyle(theme)}
      >
        {theme === "dark" ? "☾ dark" : "☀ light"}
      </button>
    </header>
  );
}
