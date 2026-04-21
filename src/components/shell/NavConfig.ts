export interface NavItem {
  path: string;
  label: string;
  kbd: string;
  indent?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { path: "/dashboard", label: "dashboard", kbd: "D" },
  { path: "/dashboard/analytics", label: "analytics", kbd: "Y" },
  { path: "/dashboard/leads", label: "leads", kbd: "L" },
  { path: "/dashboard/affiliates", label: "affiliates", kbd: "A" },
  { path: "/dashboard/brokers", label: "brokers", kbd: "B" },
  { path: "/dashboard/brokers/templates", label: "broker templates", kbd: "T", indent: true },
  { path: "/dashboard/routing", label: "routing (legacy)", kbd: "R" },
  { path: "/dashboard/routing/flows", label: "routing flows", kbd: "F", indent: true },
  { path: "/dashboard/autologin", label: "autologin", kbd: "X" },
  { path: "/dashboard/manual-review", label: "manual review", kbd: "M" },
  { path: "/dashboard/finance/pnl", label: "p&l", kbd: "P" },
  { path: "/dashboard/finance/invoices", label: "invoices", kbd: "N", indent: true },
  { path: "/dashboard/finance/crg-cohorts", label: "crg cohorts", kbd: "C", indent: true },
  { path: "/dashboard/settings/intake-metrics", label: "intake metrics", kbd: "I", indent: true },
  { path: "/dashboard/settings/schema", label: "intake schema", kbd: "S", indent: true },
  { path: "/dashboard/settings/errors", label: "error catalog", kbd: "E", indent: true },
  { path: "/dashboard/settings/blacklist", label: "blacklist", kbd: "K", indent: true },
  { path: "/dashboard/settings/users", label: "users", kbd: "U", indent: true },
  { path: "/dashboard/settings/audit", label: "audit log", kbd: "G", indent: true },
  { path: "/dashboard/settings/alerts", label: "alerts", kbd: "H", indent: true },
  { path: "/dashboard/settings/rbac-preview", label: "rbac preview", kbd: "Q", indent: true },
  { path: "/dashboard/settings/telegram", label: "telegram", kbd: "", indent: true },
  { path: "/dashboard/settings/telegram-admin", label: "telegram admin", kbd: "", indent: true },
];
