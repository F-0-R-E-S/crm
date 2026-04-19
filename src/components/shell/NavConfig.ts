export interface NavItem {
  path: string;
  label: string;
  kbd: string;
  indent?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { path: "/dashboard",           label: "dashboard",  kbd: "D" },
  { path: "/dashboard/leads",      label: "leads",     kbd: "L" },
  { path: "/dashboard/affiliates", label: "affiliates",kbd: "A" },
  { path: "/dashboard/brokers",    label: "brokers",   kbd: "B" },
  { path: "/dashboard/routing",    label: "routing",   kbd: "R" },
  { path: "/dashboard/settings/blacklist", label: "blacklist", kbd: "K", indent: true },
  { path: "/dashboard/settings/users",     label: "users",     kbd: "U", indent: true },
  { path: "/dashboard/settings/audit",     label: "audit log", kbd: "G", indent: true },
];
