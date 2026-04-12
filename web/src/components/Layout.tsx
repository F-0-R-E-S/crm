import { Outlet, NavLink } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { useAssistantStore } from '../stores/assistant'
import AssistantPanel from './AssistantPanel'
import clsx from 'clsx'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '\u{1F4CA}' },
  { path: '/leads', label: 'Leads', icon: '\u{1F464}' },
  { path: '/brokers', label: 'Brokers', icon: '\u{1F3E2}' },
  { path: '/affiliates', label: 'Affiliates', icon: '\u{1F91D}' },
  { path: '/routing', label: 'Routing', icon: '\u{1F500}' },
  { path: '/analytics', label: 'Analytics', icon: '\u{1F4C8}' },
  { path: '/settings', label: 'Settings', icon: '\u2699\uFE0F' },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const toggleAssistant = useAssistantStore((s) => s.toggle)
  const isAssistantOpen = useAssistantStore((s) => s.isOpen)

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

      <AssistantPanel />

      {!isAssistantOpen && (
        <button
          onClick={toggleAssistant}
          className="fixed bottom-6 right-6 w-12 h-12 bg-brand-600 text-white rounded-full
                     shadow-lg hover:bg-brand-700 flex items-center justify-center
                     transition-all hover:scale-105 z-40"
          title="AI Assistant"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
