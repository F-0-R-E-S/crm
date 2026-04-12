import { useState } from 'react'

const APIKEYS = [
  { name: 'Production Intake API', key: 'gc_live_4fA8x…K2qR', created: '2026-01-15', calls: '847,321' },
  { name: 'Analytics Read-Only',   key: 'gc_ro_9mB3y…Jz4W',  created: '2026-02-08', calls:  '42,180' },
  { name: 'Webhook Delivery',      key: 'gc_wh_7cN1z…Xp9L',  created: '2026-03-01', calls: '218,445' },
]

const USERS = [
  { name: 'Alex Petrov',   email: 'alex@gambchamp.io',   role: 'Network Admin',   roleClass: 'blue',   initial: 'A', grad: 'linear-gradient(135deg,#4facfe,#00f2fe)' },
  { name: 'Maria Koval',   email: 'maria@gambchamp.io',  role: 'Affiliate Mgr',   roleClass: 'purple', initial: 'M', grad: 'linear-gradient(135deg,#a78bfa,#7c3aed)' },
  { name: 'Dmitri Solov',  email: 'dmitri@gambchamp.io', role: 'Developer',       roleClass: 'emerald',initial: 'D', grad: 'linear-gradient(135deg,#34d399,#059669)' },
  { name: 'Oksana Bila',   email: 'oksana@gambchamp.io', role: 'Finance Manager', roleClass: 'amber',  initial: 'O', grad: 'linear-gradient(135deg,#fbbf24,#f59e0b)' },
  { name: 'Ivan Moroz',    email: 'ivan@gambchamp.io',   role: 'Media Buyer',     roleClass: 'rose',   initial: 'I', grad: 'linear-gradient(135deg,#f87171,#dc2626)' },
  { name: 'Svetlana Kim',  email: 'lana@gambchamp.io',   role: 'Team Lead',       roleClass: 'purple', initial: 'S', grad: 'linear-gradient(135deg,#22d3ee,#0891b2)' },
]

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  blue:    { bg: 'rgba(79,172,254,0.14)',  color: '#4facfe' },
  purple:  { bg: 'rgba(167,139,250,0.14)', color: '#a78bfa' },
  emerald: { bg: 'rgba(52,211,153,0.14)',  color: '#34d399' },
  amber:   { bg: 'rgba(251,191,36,0.14)',  color: '#fbbf24' },
  rose:    { bg: 'rgba(248,113,113,0.14)', color: '#f87171' },
}

function Toggle({ checked = false }: { checked?: boolean }) {
  const [on, setOn] = useState(checked)
  return (
    <label className="gl-switch" onClick={() => setOn(v => !v)}>
      <input type="checkbox" checked={on} onChange={() => {}} />
      <span className="gl-slider" />
    </label>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.07em',
  color: 'var(--text-3)', marginBottom: 7,
}

export default function SettingsPage() {
  const [tab, setTab] = useState<'workspace' | 'apikeys' | 'notifications' | 'users'>('workspace')

  const tabs = [
    { id: 'workspace'     as const, label: 'Workspace' },
    { id: 'apikeys'       as const, label: 'API Keys' },
    { id: 'notifications' as const, label: 'Notifications' },
    { id: 'users'         as const, label: 'Users & RBAC' },
  ]

  return (
    <div className="page-section">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Settings</h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>Workspace configuration and access control</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: 14, width: 'fit-content', marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
            background: tab === t.id ? 'rgba(255,255,255,0.10)' : 'transparent',
            color: tab === t.id ? 'var(--text-1)' : 'var(--text-3)',
            boxShadow: tab === t.id ? '0 2px 8px rgba(0,0,0,0.25)' : 'none',
            transition: 'all 0.2s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── Workspace ── */}
      {tab === 'workspace' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="glass-card">
            <div className="section-label">General</div>
            {[
              { label: 'Workspace Name', val: 'GambChamp Production' },
              { label: 'Domain',         val: 'crm.gambchamp.io' },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 16 }}>
                <label style={labelStyle}>{f.label}</label>
                <input type="text" defaultValue={f.val} className="glass-input" />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Timezone</label>
                <input type="text" defaultValue="UTC+3 (Moscow)" className="glass-input" />
              </div>
              <div>
                <label style={labelStyle}>Currency</label>
                <input type="text" defaultValue="USD" className="glass-input" />
              </div>
            </div>
            <button className="btn-primary" style={{ fontSize: 12, padding: '8px 18px' }}>Save Changes</button>
          </div>

          <div className="glass-card">
            <div className="section-label">Preferences</div>
            {[
              { title: 'Telegram Alerts',    desc: 'Real-time alerts via Telegram bot',          on: true },
              { title: 'Auto Fraud Block',   desc: 'Block leads with fraud score below 40',       on: true },
              { title: 'Duplicate Detection',desc: 'Block duplicate email/phone within 30 days',  on: true },
              { title: 'UAD Redelivery',     desc: 'Automatically redeliver failed leads',        on: false },
              { title: 'Daily Summary',      desc: 'Send daily performance report at 08:00',      on: false },
            ].map(item => (
              <div key={item.title} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--glass-border)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{item.desc}</div>
                </div>
                <Toggle checked={item.on} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── API Keys ── */}
      {tab === 'apikeys' && (
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div className="section-label" style={{ margin: 0 }}>API Keys</div>
            <button className="btn-primary" style={{ fontSize: 12, padding: '7px 16px' }}>+ Generate Key</button>
          </div>
          {APIKEYS.map(k => (
            <div key={k.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: 12, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{k.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                  Created {k.created} · {k.calls} calls
                </div>
              </div>
              <code style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', color: 'var(--text-3)', fontFamily: 'monospace' }}>
                {k.key}
              </code>
              <button className="btn-ghost">Copy</button>
              <button className="btn-ghost" style={{ color: '#f87171', borderColor: 'rgba(248,113,113,0.2)' }}>Revoke</button>
            </div>
          ))}
        </div>
      )}

      {/* ── Notifications ── */}
      {tab === 'notifications' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="glass-card">
            <div className="section-label">Telegram Bot</div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Bot Token</label>
              <input type="text" defaultValue="7391022847:AAH-●●●●●●●●●●" className="glass-input" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Chat ID</label>
              <input type="text" defaultValue="-100198372641" className="glass-input" />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-glass" style={{ fontSize: 12 }}>Test Message</button>
              <button className="btn-primary" style={{ fontSize: 12 }}>Save</button>
            </div>
          </div>

          <div className="glass-card">
            <div className="section-label">Alert Events</div>
            {[
              { title: 'Lead Delivered',   on: true },
              { title: 'Lead Rejected',    on: true },
              { title: 'Fraud Detected',   on: true },
              { title: 'Broker Offline',   on: true },
              { title: 'Cap Reached',      on: true },
              { title: 'Daily Summary',    on: false },
              { title: 'New Conversion',   on: false },
            ].map(ev => (
              <div key={ev.title} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: 14, color: 'var(--text-1)' }}>{ev.title}</span>
                <Toggle checked={ev.on} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Users ── */}
      {tab === 'users' && (
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div className="section-label" style={{ margin: 0 }}>Team Members</div>
            <button className="btn-primary" style={{ fontSize: 12, padding: '7px 16px' }}>+ Invite User</button>
          </div>
          {USERS.map(u => {
            const rc = ROLE_COLORS[u.roleClass] ?? ROLE_COLORS.blue
            return (
              <div key={u.email} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: u.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
                  {u.initial}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{u.email}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: rc.bg, color: rc.color }}>
                  {u.role}
                </span>
                <button className="btn-ghost">Edit</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
