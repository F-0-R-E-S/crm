import { Outlet, NavLink } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import clsx from 'clsx'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '\u{1F4CA}' },
  { path: '/leads', label: 'Leads', icon: '\u{1F464}' },
  { path: '/brokers', label: 'Brokers', icon: '\u{1F3E2}' },
  { path: '/affiliates', label: 'Affiliates', icon: '\u{1F91D}' },
  { path: '/routing', label: 'Routing', icon: '\u{1F500}' },
  { path: '/uad', label: 'UAD', icon: '\u{1F504}' },
  { path: '/smart-routing', label: 'AI Routing', icon: '\u{1F9E0}' },
  { path: '/analytics', label: 'Analytics', icon: '\u{1F4C8}' },
  { path: '/settings', label: 'Settings', icon: '\u2699\uFE0F' },
]

export default function Layout() {
  const { user, logout } = useAuthStore()

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold text-brand-400">GambChamp CRM</h1>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
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
          <div className="text-sm text-gray-400">{user?.email}</div>
          <button
            onClick={logout}
            className="mt-2 text-sm text-gray-400 hover:text-white transition-colors"
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
