"use client";
import { Pill } from "@/components/router-crm";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { NAV_GROUPS, type NavGroup, type NavItem } from "./NavConfig";
import { useThemeCtx } from "./ThemeProvider";

interface Props {
  userEmail: string;
  userRole: string;
  queueCount?: number;
}

const COLLAPSED_W = 52;
const EXPANDED_W = 220;

function isActive(pathname: string, itemPath: string): boolean {
  if (pathname === itemPath) return true;
  if (itemPath === "/dashboard/leads" && pathname.startsWith("/dashboard/leads")) return true;
  if (itemPath === "/dashboard/affiliates" && pathname.startsWith("/dashboard/affiliates"))
    return true;
  if (itemPath === "/dashboard/brokers" && pathname.startsWith("/dashboard/brokers")) return true;
  if (itemPath === "/dashboard/routing/flows" && pathname.startsWith("/dashboard/routing/flows")) {
    return true;
  }
  if (itemPath === "/dashboard/routing" && pathname === "/dashboard/routing") {
    return true;
  }
  return false;
}

function groupHasActive(pathname: string, group: NavGroup): boolean {
  return group.items.some((it) => isActive(pathname, it.path));
}

export function Sidebar({ userEmail, userRole, queueCount = 0 }: Props) {
  const { theme } = useThemeCtx();
  const pathname = usePathname();
  const bd = "var(--bd-1)";
  const fg = "var(--fg-1)";
  const fgStrong = "var(--fg-0)";
  const bg = theme === "dark" ? "var(--bg-1)" : "var(--bg-0)";

  const [collapsed, setCollapsed] = useState(false);
  // id → open?
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isSuperAdmin = userRole === "SUPER_ADMIN";

  // Hydrate from localStorage
  useEffect(() => {
    const c = localStorage.getItem("sidebar:collapsed");
    if (c) setCollapsed(c === "1");
    const o = localStorage.getItem("sidebar:open");
    if (o) {
      try {
        setOpen(JSON.parse(o));
      } catch {
        /* ignore */
      }
    } else {
      // default — expand all groups
      setOpen(Object.fromEntries(NAV_GROUPS.map((g) => [g.id, true])));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar:collapsed", collapsed ? "1" : "0");
  }, [collapsed]);
  useEffect(() => {
    localStorage.setItem("sidebar:open", JSON.stringify(open));
  }, [open]);

  // Auto-expand the group containing the active route.
  // Intentionally omit `open` from deps — we only want this to fire on
  // route change, not every time the user toggles a group.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see comment above
  useEffect(() => {
    const hit = NAV_GROUPS.find((g) => groupHasActive(pathname, g));
    if (hit && !open[hit.id]) setOpen((prev) => ({ ...prev, [hit.id]: true }));
  }, [pathname]);

  const width = collapsed ? COLLAPSED_W : EXPANDED_W;

  const toggleGroup = (id: string) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <aside
      style={{
        width,
        flexShrink: 0,
        borderRight: `1px solid ${bd}`,
        display: "flex",
        flexDirection: "column",
        background: bg,
        position: "relative",
        transition: "width 180ms ease",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: collapsed ? "18px 10px 16px" : "18px 18px 16px",
          borderBottom: `1px solid ${bd}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: fgStrong,
              color: theme === "dark" ? "var(--bg-1)" : "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 13,
              fontFamily: "var(--mono)",
            }}
          >
            R
          </div>
          {!collapsed && (
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: fgStrong,
                  letterSpacing: "-0.01em",
                }}
              >
                ROUTER
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontFamily: "var(--mono)",
                  color: fg,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                crm · v0.1
              </div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="collapse sidebar"
            title="Collapse sidebar"
            style={{
              background: "transparent",
              border: "none",
              color: fg,
              cursor: "pointer",
              fontSize: 14,
              padding: 4,
              lineHeight: 1,
            }}
          >
            ‹‹
          </button>
        )}
      </div>

      <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto", overflowX: "hidden" }}>
        {collapsed ? (
          <CollapsedNav pathname={pathname} />
        ) : (
          <>
            {NAV_GROUPS.map((group) => (
              <Group
                key={group.id}
                group={group}
                open={open[group.id] ?? false}
                toggle={() => toggleGroup(group.id)}
                pathname={pathname}
              />
            ))}
            {isSuperAdmin && (
              <Group
                group={{
                  id: "super-admin",
                  label: "super-admin",
                  items: [
                    {
                      path: "/super-admin/tenants",
                      label: "tenants",
                      kbd: "Z",
                    },
                  ],
                }}
                open={open["super-admin"] ?? true}
                toggle={() => toggleGroup("super-admin")}
                pathname={pathname}
              />
            )}
          </>
        )}
      </nav>

      {collapsed ? (
        <div
          style={{
            padding: "10px 0",
            borderTop: `1px solid ${bd}`,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="expand sidebar"
            title="Expand sidebar"
            style={{
              background: "transparent",
              border: "none",
              color: fg,
              cursor: "pointer",
              fontSize: 14,
              padding: 4,
              lineHeight: 1,
            }}
          >
            ››
          </button>
        </div>
      ) : (
        <div
          style={{
            padding: "12px 18px",
            borderTop: `1px solid ${bd}`,
            fontSize: 10,
            fontFamily: "var(--mono)",
            color: fg,
            letterSpacing: "0.06em",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 140,
              }}
            >
              {userEmail}
            </span>
            <Pill tone="accent" size="xs">
              {userRole}
            </Pill>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              color: theme === "dark" ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)",
            }}
          >
            <span>queue</span>
            <span>{queueCount} pending</span>
          </div>
        </div>
      )}
    </aside>
  );
}

function Group({
  group,
  open,
  toggle,
  pathname,
}: {
  group: NavGroup;
  open: boolean;
  toggle: () => void;
  pathname: string;
}) {
  const { theme } = useThemeCtx();
  const hasActive = useMemo(() => groupHasActive(pathname, group), [pathname, group]);
  const fgLabel = theme === "dark" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";
  const fgLabelActive = theme === "dark" ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.75)";

  return (
    <div style={{ marginBottom: 2 }}>
      <button
        type="button"
        onClick={toggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 18px 6px",
          background: "transparent",
          border: "none",
          color: hasActive ? fgLabelActive : fgLabel,
          fontSize: 9,
          fontFamily: "var(--mono)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 10,
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 120ms ease",
          }}
        >
          ›
        </span>
        <span style={{ flex: 1 }}>{group.label}</span>
      </button>
      {open &&
        group.items.map((item) => (
          <NavRow key={item.path} item={item} active={isActive(pathname, item.path)} />
        ))}
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
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 18px 7px 32px",
        background: active ? activeBg : hover ? hoverBg : "transparent",
        color: active ? fgStrong : fg,
        fontSize: 13,
        fontFamily: "var(--sans)",
        textDecoration: "none",
        borderLeft: active ? `2px solid ${fgStrong}` : "2px solid transparent",
      }}
    >
      <span style={{ flex: 1, fontWeight: active ? 500 : 400 }}>{item.label}</span>
      {item.kbd && (
        <span
          style={{
            fontSize: 10,
            fontFamily: "var(--mono)",
            color: theme === "dark" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
            padding: "1px 5px",
            border: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
            borderRadius: 3,
          }}
        >
          {item.kbd}
        </span>
      )}
    </Link>
  );
}

function CollapsedNav({ pathname }: { pathname: string }) {
  const { theme } = useThemeCtx();
  const fg = theme === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)";
  const fgStrong = theme === "dark" ? "var(--fg-0)" : "var(--ink)";
  const hoverBg = theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
  const activeBg = theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      {NAV_GROUPS.map((g) => {
        const hit = g.items.find((it) => isActive(pathname, it.path)) ?? g.items[0];
        const active = groupHasActive(pathname, g);
        return (
          <CollapsedRow
            key={g.id}
            href={hit.path}
            active={active}
            label={g.label}
            letter={g.label[0].toUpperCase()}
            fg={fg}
            fgStrong={fgStrong}
            hoverBg={hoverBg}
            activeBg={activeBg}
          />
        );
      })}
    </div>
  );
}

function CollapsedRow({
  href,
  active,
  label,
  letter,
  fg,
  fgStrong,
  hoverBg,
  activeBg,
}: {
  href: string;
  active: boolean;
  label: string;
  letter: string;
  fg: string;
  fgStrong: string;
  hoverBg: string;
  activeBg: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={href as never}
      title={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 36,
        height: 36,
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: active ? activeBg : hover ? hoverBg : "transparent",
        color: active ? fgStrong : fg,
        fontSize: 12,
        fontFamily: "var(--mono)",
        fontWeight: active ? 600 : 500,
        textDecoration: "none",
        textTransform: "uppercase",
      }}
    >
      {letter}
    </Link>
  );
}
