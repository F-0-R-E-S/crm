"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_ITEMS, type NavItem } from "./NavConfig";
import { Pill } from "@/components/router-crm";
import { useThemeCtx } from "./ThemeProvider";

interface Props {
  userEmail: string;
  userRole: string;
  queueCount?: number;
}

export function Sidebar({ userEmail, userRole, queueCount = 0 }: Props) {
  const { theme } = useThemeCtx();
  const pathname = usePathname();
  const bd = "var(--bd-1)";
  const fg = "var(--fg-1)";
  const fgStrong = "var(--fg-0)";
  const bg = theme === "dark" ? "var(--bg-1)" : "var(--bg-0)";

  const operations = NAV_ITEMS.filter(n => !n.path.includes("/settings/"));
  const settings = NAV_ITEMS.filter(n => n.path.includes("/settings/"));

  return (
    <aside style={{
      width: 220, flexShrink: 0, borderRight: `1px solid ${bd}`,
      display: "flex", flexDirection: "column", background: bg, position: "relative",
    }}>
      <div style={{ padding: "18px 18px 16px", borderBottom: `1px solid ${bd}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: fgStrong, color: theme === "dark" ? "var(--bg-1)" : "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 13, fontFamily: "var(--mono)",
          }}>R</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: fgStrong, letterSpacing: "-0.01em" }}>ROUTER</div>
            <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: fg, letterSpacing: "0.08em", textTransform: "uppercase" }}>crm · v0.1</div>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: "10px 0", overflowY: "auto" }}>
        <SectionLabel>operations</SectionLabel>
        {operations.map(item => (
          <NavRow key={item.path} item={item} active={isActive(pathname, item.path)} />
        ))}
        <SectionLabel>settings</SectionLabel>
        {settings.map(item => (
          <NavRow key={item.path} item={item} active={pathname === item.path} />
        ))}
      </nav>
      <div style={{ padding: "12px 18px", borderTop: `1px solid ${bd}`, fontSize: 10, fontFamily: "var(--mono)", color: fg, letterSpacing: "0.06em" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span>{userEmail}</span>
          <Pill tone="accent" size="xs">{userRole}</Pill>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", color: theme === "dark" ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)" }}>
          <span>queue</span><span>{queueCount} pending</span>
        </div>
      </div>
    </aside>
  );
}

function isActive(pathname: string, itemPath: string): boolean {
  if (pathname === itemPath) return true;
  if (itemPath === "/dashboard/leads" && pathname.startsWith("/dashboard/leads")) return true;
  if (itemPath === "/dashboard/affiliates" && pathname.startsWith("/dashboard/affiliates")) return true;
  if (itemPath === "/dashboard/brokers" && pathname.startsWith("/dashboard/brokers")) return true;
  return false;
}

function SectionLabel({ children }: { children: string }) {
  const { theme } = useThemeCtx();
  const fg = theme === "dark" ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)";
  return (
    <div style={{ padding: "14px 18px 6px", fontSize: 9, fontFamily: "var(--mono)", color: fg, letterSpacing: "0.14em", textTransform: "uppercase" }}>
      {children}
    </div>
  );
}

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const { theme } = useThemeCtx();
  const [hover, setHover] = useState(false);
  const fg = theme === "dark" ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.65)";
  const fgStrong = theme === "dark" ? "var(--fg-0)" : "var(--ink)";
  const hoverBg = theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
  const activeBg = theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";

  return (
    <Link
      href={item.path as never}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: item.indent ? "7px 18px 7px 32px" : "7px 18px",
        background: active ? activeBg : (hover ? hoverBg : "transparent"),
        color: active ? fgStrong : fg,
        fontSize: 13, fontFamily: "var(--sans)", textDecoration: "none",
        borderLeft: active ? `2px solid ${fgStrong}` : "2px solid transparent",
      }}
    >
      <span style={{ flex: 1, fontWeight: active ? 500 : 400 }}>{item.label}</span>
      <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: theme === "dark" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)", padding: "1px 5px", border: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, borderRadius: 3 }}>
        {item.kbd}
      </span>
    </Link>
  );
}
