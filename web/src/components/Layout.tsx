import { Outlet, NavLink } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { usePermissions } from '../hooks/usePermissions'
import NotificationBell from './NotificationBell'
import clsx from 'clsx'

interface NavItem {
  path: string
  label: string
  icon: string
  permission?: string
  anyOf?: string[]
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: '\u{1F4CA}' },
  { path: '/leads', label: 'Leads', icon: '\u{1F464}', permission: 'leads:read' },
  { path: '/brokers', label: 'Brokers', icon: '\u{1F3E2}', permission: 'brokers:read' },
  { path: '/affiliates', label: 'Affiliates', icon: '\u{1F91D}', permission: 'affiliates:read' },
  { path: '/routing', label: 'Routing', icon: '\u{1F500}', permission: 'routing:read' },
  { path: '/analytics', label: 'Analytics', icon: '\u{1F4C8}', permission: 'analytics:read' },
  { path: '/users', label: 'Users', icon: '\u{1F465}', permission: 'users:read' },
  { path: '/settings', label: 'Settings', icon: '\u2699\uFE0F' },
]

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  network_admin: 'Network Admin',
  affiliate_manager: 'Affiliate Manager',
  team_lead: 'Team Lead',
  media_buyer: 'Media Buyer',
  finance_manager: 'Finance Manager',
}

export default function Layout() {
  const { user, logout } = useAuthStore()
  const { has, role } = usePermissions()

  const visibleItems = navItems.filter((item) => {
    if (!item.permission && !item.anyOf) return true
    if (item.permission) return has(item.permission)
    return true
  })

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold text-brand-400">GambChamp CRM</h1>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-300">{user?.name || user?.email}</div>
              <div className="text-xs text-gray-500">{ROLE_LABELS[role] || role}</div>
            </div>
            <NotificationBell />
          </div>
          <button
            onClick={logout}
            className="mt-3 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
