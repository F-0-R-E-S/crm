export interface NavItem {
  path: string;
  label: string;
  kbd?: string;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "overview",
    items: [
      { path: "/dashboard", label: "dashboard", kbd: "D" },
      { path: "/dashboard/analytics", label: "analytics", kbd: "Y" },
    ],
  },
  {
    id: "traffic",
    label: "traffic",
    items: [
      { path: "/dashboard/leads", label: "leads", kbd: "L" },
      { path: "/dashboard/manual-review", label: "manual review", kbd: "M" },
    ],
  },
  {
    id: "partners",
    label: "partners",
    items: [
      { path: "/dashboard/affiliates", label: "affiliates", kbd: "A" },
      { path: "/dashboard/brokers", label: "brokers", kbd: "B" },
      { path: "/dashboard/brokers/templates", label: "broker templates", kbd: "T" },
      { path: "/dashboard/autologin", label: "autologin", kbd: "X" },
    ],
  },
  {
    id: "routing",
    label: "routing",
    items: [
      { path: "/dashboard/routing", label: "overview", kbd: "R" },
      { path: "/dashboard/routing/flows", label: "flows", kbd: "F" },
    ],
  },
  {
    id: "finance",
    label: "finance",
    items: [
      { path: "/dashboard/finance/pnl", label: "p&l", kbd: "P" },
      { path: "/dashboard/finance/invoices", label: "invoices", kbd: "N" },
      { path: "/dashboard/finance/crg-cohorts", label: "crg cohorts", kbd: "C" },
    ],
  },
  {
    id: "settings",
    label: "settings",
    items: [
      { path: "/dashboard/settings/intake-metrics", label: "intake metrics", kbd: "I" },
      { path: "/dashboard/settings/schema", label: "intake schema", kbd: "S" },
      { path: "/dashboard/settings/errors", label: "error catalog", kbd: "E" },
      { path: "/dashboard/settings/blacklist", label: "blacklist", kbd: "K" },
      { path: "/dashboard/settings/users", label: "users", kbd: "U" },
      { path: "/dashboard/settings/audit", label: "audit log", kbd: "G" },
      { path: "/dashboard/settings/alerts", label: "alerts", kbd: "H" },
      { path: "/dashboard/settings/rbac-preview", label: "rbac preview", kbd: "Q" },
      { path: "/dashboard/settings/scheduled-changes", label: "scheduled changes", kbd: "J" },
      { path: "/dashboard/settings/telegram", label: "telegram" },
      { path: "/dashboard/settings/telegram-admin", label: "telegram admin" },
    ],
  },
];

// Flat list — used by KeyboardNav to bind hotkeys globally.
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
