import { useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { useAssistantStore } from '../stores/assistant'
import { api } from '../lib/api'
import AssistantPanel from './AssistantPanel'

const navItems = [
  { path: '/dashboard',    label: 'Dashboard',    icon: '⬡' },
  { path: '/leads',        label: 'Leads',        icon: '👤' },
  { path: '/brokers',      label: 'Brokers',      icon: '🏢' },
  { path: '/affiliates',   label: 'Affiliates',   icon: '🔗' },
  { path: '/routing',      label: 'Routing',      icon: '⇄' },
  { path: '/conversions',  label: 'Conversions',  icon: '💰' },
  { path: '/marketplace',  label: 'Marketplace',  icon: '🛒' },
  { path: '/analytics',    label: 'Analytics',    icon: '📊' },
  { path: '/settings',     label: 'Settings',     icon: '⚙' },
]

const sectionBreak = 5 // insert divider after Routing

interface MeResponse {
  id: string
  email: string
  name: string
  role: string
}

export default function Layout() {
  const { user, token, logout, setUser } = useAuthStore()
  const toggleAssistant  = useAssistantStore((s) => s.toggle)
  const isAssistantOpen  = useAssistantStore((s) => s.isOpen)

  const initial = (user?.email?.[0] ?? 'U').toUpperCase()

  useEffect(() => {
    if (!token) return
    api.get<MeResponse>('/auth/me')
      .then((me) => setUser({ id: me.id, email: me.email, name: me.name, role: me.role }))
      .catch(() => {
        // ignore boot-time profile sync errors
      })
  }, [token, setUser])

  return (
    <div style={{ display: 'flex', height: '100vh', position: 'relative', zIndex: 1 }}>

      {/* ── Aurora bg ── */}
      <div className="aurora">
        <div className="aurora-orb aurora-orb-1" />
        <div className="aurora-orb aurora-orb-2" />
        <div className="aurora-orb aurora-orb-3" />
        <div className="aurora-orb aurora-orb-4" />
      </div>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 240,
        minWidth: 240,
        height: '100vh',
        background: 'var(--glass-light)',
        backdropFilter: 'var(--blur-md)',
        WebkitBackdropFilter: 'var(--blur-md)',
        borderRight: '1px solid var(--glass-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 12px',
        position: 'relative',
        zIndex: 100,
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 8px 20px',
          borderBottom: '1px solid var(--glass-border)',
          marginBottom: 16,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 16, color: '#fff',
            boxShadow: '0 0 20px rgba(79,172,254,0.4), 0 2px 8px rgba(0,0,0,0.4)',
          }}>G</div>
          <div>
            <div style={{
              fontSize: 14, fontWeight: 700,
              background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>GambChamp</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>CRM Platform</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1 }}>
          {navItems.map((item, i) => (
            <>
              {i === sectionBreak && (
                <div key="divider" style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
                  color: 'var(--text-3)', textTransform: 'uppercase',
                  padding: '8px 8px 4px', marginTop: 4,
                }}>Ops</div>
              )}
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 14,
                  textDecoration: 'none', position: 'relative',
                  marginBottom: 2,
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(79,172,254,0.16), rgba(0,242,254,0.08))'
                    : 'transparent',
                  boxShadow: isActive
                    ? '0 0 0 1px rgba(79,172,254,0.22), inset 0 1px 0 rgba(255,255,255,0.07)'
                    : 'none',
                  transition: 'background 0.2s, box-shadow 0.2s',
                })}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div style={{
                        position: 'absolute', left: 0, top: '25%', bottom: '25%',
                        width: 3, borderRadius: 2,
                        background: 'linear-gradient(180deg, #4facfe, #00f2fe)',
                        boxShadow: '0 0 8px #4facfe',
                      }} />
                    )}
                    <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>
                      {item.icon}
                    </span>
                    <span style={{
                      fontSize: 13.5, fontWeight: isActive ? 500 : 400,
                      color: isActive ? 'var(--text-1)' : 'var(--text-2)',
                    }}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            </>
          ))}
        </nav>

        {/* Footer */}
        <div style={{
          paddingTop: 12,
          borderTop: '1px solid var(--glass-border)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 14, cursor: 'pointer',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 600, color: '#fff',
            }}>{initial}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{user?.role ?? 'User'}</div>
            </div>
          </div>
          <button
            onClick={logout}
            style={{
              width: '100%', marginTop: 4,
              padding: '8px 10px', borderRadius: 14,
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 12, color: 'var(--text-3)', textAlign: 'left',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--rose)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
          >
            ↗ Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: '28px 32px',
        position: 'relative', zIndex: 1,
      }}>
        <Outlet />
      </main>

      <AssistantPanel />

      {!isAssistantOpen && (
        <button
          onClick={toggleAssistant}
          style={{
            position: 'fixed', bottom: 24, right: 24,
            width: 48, height: 48, borderRadius: '50%',
            background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
            border: 'none', cursor: 'pointer', zIndex: 400,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 24px rgba(79,172,254,0.45), 0 0 0 1px rgba(79,172,254,0.3)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.08)'
            e.currentTarget.style.boxShadow = '0 8px 36px rgba(79,172,254,0.6)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 4px 24px rgba(79,172,254,0.45)'
          }}
          title="AI Assistant"
        >
          <svg width="20" height="20" fill="none" stroke="#fff" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}
    </div>
  )
}
