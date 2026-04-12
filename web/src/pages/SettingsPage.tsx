import { useState } from 'react'
import { api } from '../lib/api'

type RoleTone = 'blue' | 'purple' | 'emerald' | 'amber' | 'rose'

interface ApiKeyItem {
  name: string
  key: string
  created: string
  calls: string
}

interface UserItem {
  name: string
  email: string
  role: string
  roleClass: RoleTone
  initial: string
  grad: string
}

interface CreateAPIKeyResponse {
  key: string
  name: string
  created_at: string
}

const INITIAL_APIKEYS: ApiKeyItem[] = [
  { name: 'Production Intake API', key: 'gc_live_4fA8x…K2qR', created: '2026-01-15', calls: '847,321' },
  { name: 'Analytics Read-Only', key: 'gc_ro_9mB3y…Jz4W', created: '2026-02-08', calls: '42,180' },
  { name: 'Webhook Delivery', key: 'gc_wh_7cN1z…Xp9L', created: '2026-03-01', calls: '218,445' },
]

const INITIAL_USERS: UserItem[] = [
  { name: 'Alex Petrov', email: 'alex@gambchamp.io', role: 'Network Admin', roleClass: 'blue', initial: 'A', grad: 'linear-gradient(135deg,#4facfe,#00f2fe)' },
  { name: 'Maria Koval', email: 'maria@gambchamp.io', role: 'Affiliate Mgr', roleClass: 'purple', initial: 'M', grad: 'linear-gradient(135deg,#a78bfa,#7c3aed)' },
  { name: 'Dmitri Solov', email: 'dmitri@gambchamp.io', role: 'Developer', roleClass: 'emerald', initial: 'D', grad: 'linear-gradient(135deg,#34d399,#059669)' },
  { name: 'Oksana Bila', email: 'oksana@gambchamp.io', role: 'Finance Manager', roleClass: 'amber', initial: 'O', grad: 'linear-gradient(135deg,#fbbf24,#f59e0b)' },
  { name: 'Ivan Moroz', email: 'ivan@gambchamp.io', role: 'Media Buyer', roleClass: 'rose', initial: 'I', grad: 'linear-gradient(135deg,#f87171,#dc2626)' },
  { name: 'Svetlana Kim', email: 'lana@gambchamp.io', role: 'Team Lead', roleClass: 'purple', initial: 'S', grad: 'linear-gradient(135deg,#22d3ee,#0891b2)' },
]

const ROLE_COLORS: Record<RoleTone, { bg: string; color: string }> = {
  blue: { bg: 'rgba(79,172,254,0.14)', color: '#4facfe' },
  purple: { bg: 'rgba(167,139,250,0.14)', color: '#a78bfa' },
  emerald: { bg: 'rgba(52,211,153,0.14)', color: '#34d399' },
  amber: { bg: 'rgba(251,191,36,0.14)', color: '#fbbf24' },
  rose: { bg: 'rgba(248,113,113,0.14)', color: '#f87171' },
}

const ROLE_GRADIENTS: Record<RoleTone, string> = {
  blue: 'linear-gradient(135deg,#4facfe,#00f2fe)',
  purple: 'linear-gradient(135deg,#a78bfa,#7c3aed)',
  emerald: 'linear-gradient(135deg,#34d399,#059669)',
  amber: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
  rose: 'linear-gradient(135deg,#f87171,#dc2626)',
}

function Toggle({ checked = false }: { checked?: boolean }) {
  const [on, setOn] = useState(checked)
  return (
    <label className="gl-switch" onClick={() => setOn((v) => !v)}>
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

const INITIAL_KEY_FORM = {
  name: '',
  scope: 'intake:write',
  rotationDays: 90,
}

const INITIAL_INVITE_FORM = {
  name: '',
  email: '',
  role: 'Media Buyer',
}

export default function SettingsPage() {
  const [tab, setTab] = useState<'workspace' | 'apikeys' | 'notifications' | 'users'>('workspace')
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(INITIAL_APIKEYS)
  const [users, setUsers] = useState<UserItem[]>(INITIAL_USERS)

  const [showKeyModal, setShowKeyModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [keyForm, setKeyForm] = useState(INITIAL_KEY_FORM)
  const [inviteForm, setInviteForm] = useState(INITIAL_INVITE_FORM)
  const [keyLoading, setKeyLoading] = useState(false)
  const [keyError, setKeyError] = useState('')
  const [flashMessage, setFlashMessage] = useState('')

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const tabs = [
    { id: 'workspace' as const, label: 'Workspace' },
    { id: 'apikeys' as const, label: 'API Keys' },
    { id: 'notifications' as const, label: 'Notifications' },
    { id: 'users' as const, label: 'Users & RBAC' },
  ]

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirm password do not match')
      return
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters')
      return
    }

    setPasswordLoading(true)
    try {
      const res = await api.post<{ message: string }>('/auth/change-password', {
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword,
      })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setFlashMessage(res.message || 'Password changed successfully')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="page-section">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Settings</h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>Workspace configuration and access control</p>
      </div>

      {flashMessage && (
        <div className="form-alert form-alert-success" style={{ marginBottom: 14 }}>
          {flashMessage}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: 14, width: 'fit-content', marginBottom: 24 }}>
        {tabs.map((t) => (
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

      {tab === 'workspace' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="glass-card">
            <div className="section-label">General</div>
            {[
              { label: 'Workspace Name', val: 'GambChamp Production' },
              { label: 'Domain', val: 'crm.gambchamp.io' },
            ].map((f) => (
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

            <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--glass-border)' }}>
              <div className="section-label">Security</div>
              {passwordError && (
                <div className="form-alert form-alert-error" style={{ marginBottom: 10 }}>
                  {passwordError}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="form-grid">
                <div className="form-field">
                  <label className="form-label" htmlFor="settings-current-password">Current Password</label>
                  <input
                    id="settings-current-password"
                    type="password"
                    className="form-control"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-grid form-grid-2">
                  <div className="form-field">
                    <label className="form-label" htmlFor="settings-new-password">New Password</label>
                    <input
                      id="settings-new-password"
                      type="password"
                      className="form-control"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                      minLength={8}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label" htmlFor="settings-confirm-password">Confirm New Password</label>
                    <input
                      id="settings-confirm-password"
                      type="password"
                      className="form-control"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      minLength={8}
                      required
                    />
                  </div>
                </div>
                <div className="form-actions" style={{ marginTop: 0 }}>
                  <button type="submit" className="btn-primary" disabled={passwordLoading}>
                    {passwordLoading ? 'Updating…' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="glass-card">
            <div className="section-label">Preferences</div>
            {[
              { title: 'Telegram Alerts', desc: 'Real-time alerts via Telegram bot', on: true },
              { title: 'Auto Fraud Block', desc: 'Block leads with fraud score below 40', on: true },
              { title: 'Duplicate Detection', desc: 'Block duplicate email/phone within 30 days', on: true },
              { title: 'UAD Redelivery', desc: 'Automatically redeliver failed leads', on: false },
              { title: 'Daily Summary', desc: 'Send daily performance report at 08:00', on: false },
            ].map((item) => (
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

      {tab === 'apikeys' && (
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div className="section-label" style={{ margin: 0 }}>API Keys</div>
            <button
              className="btn-primary"
              style={{ fontSize: 12, padding: '7px 16px' }}
              onClick={() => {
                setShowKeyModal(true)
                setFlashMessage('')
                setKeyError('')
              }}
            >
              + Generate Key
            </button>
          </div>
          {apiKeys.map((k) => (
            <div key={`${k.name}-${k.key}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: 12, marginBottom: 10 }}>
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
              { title: 'Lead Delivered', on: true },
              { title: 'Lead Rejected', on: true },
              { title: 'Fraud Detected', on: true },
              { title: 'Broker Offline', on: true },
              { title: 'Cap Reached', on: true },
              { title: 'Daily Summary', on: false },
              { title: 'New Conversion', on: false },
            ].map((ev) => (
              <div key={ev.title} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: 14, color: 'var(--text-1)' }}>{ev.title}</span>
                <Toggle checked={ev.on} />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div className="section-label" style={{ margin: 0 }}>Team Members</div>
            <button
              className="btn-primary"
              style={{ fontSize: 12, padding: '7px 16px' }}
              onClick={() => {
                setShowInviteModal(true)
                setFlashMessage('')
              }}
            >
              + Invite User
            </button>
          </div>
          {users.map((u) => {
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

      {showKeyModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowKeyModal(false)}>
          <form
            className="modal-box"
            style={{ maxWidth: 680 }}
            onSubmit={async (e) => {
              e.preventDefault()
              setKeyError('')
              setKeyLoading(true)

              try {
                const res = await api.post<CreateAPIKeyResponse>('/auth/api-keys', {
                  name: keyForm.name.trim(),
                  scopes: [keyForm.scope],
                })

                setApiKeys((prev) => [
                  {
                    name: res.name,
                    key: res.key,
                    created: new Date(res.created_at).toISOString().slice(0, 10),
                    calls: '0',
                  },
                  ...prev,
                ])
                setShowKeyModal(false)
                setKeyForm(INITIAL_KEY_FORM)
                setFlashMessage(`API key “${res.name}” generated.`)
              } catch (err) {
                setKeyError(err instanceof Error ? err.message : 'Failed to generate API key')
              } finally {
                setKeyLoading(false)
              }
            }}
          >
            <div className="form-header">
              <div>
                <div className="form-title">Generate API Key</div>
                <div className="form-subtitle">Create scoped key with rotation policy for integrations.</div>
              </div>
              <button
                type="button"
                className="btn-ghost"
                style={{ width: 32, height: 32, borderRadius: 16, padding: 0, justifyContent: 'center' }}
                onClick={() => setShowKeyModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {keyError && (
              <div className="form-alert form-alert-error" style={{ marginBottom: 10 }}>
                {keyError}
              </div>
            )}

            <div className="form-grid form-grid-2">
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" htmlFor="api-key-name">Key Name</label>
                <input
                  id="api-key-name"
                  className="form-control"
                  value={keyForm.name}
                  onChange={(e) => setKeyForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Lead Intake Production"
                  required
                  autoFocus
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="api-key-scope">Scope</label>
                <select
                  id="api-key-scope"
                  className="form-control"
                  value={keyForm.scope}
                  onChange={(e) => setKeyForm((prev) => ({ ...prev, scope: e.target.value }))}
                >
                  <option value="intake:write">intake:write</option>
                  <option value="analytics:read">analytics:read</option>
                  <option value="webhook:manage">webhook:manage</option>
                </select>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="api-key-rotation">Rotation (Days)</label>
                <input
                  id="api-key-rotation"
                  className="form-control"
                  type="number"
                  min={7}
                  value={keyForm.rotationDays}
                  onChange={(e) => setKeyForm((prev) => ({ ...prev, rotationDays: Math.max(7, Number(e.target.value) || 7) }))}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={() => setShowKeyModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={keyLoading || !keyForm.name.trim()}>
                {keyLoading ? 'Generating…' : 'Generate Key'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showInviteModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowInviteModal(false)}>
          <form
            className="modal-box"
            style={{ maxWidth: 700 }}
            onSubmit={(e) => {
              e.preventDefault()

              const tone = roleToneFromLabel(inviteForm.role)
              const fallbackName = inviteForm.name.trim() || inviteForm.email.split('@')[0] || 'New User'
              const user: UserItem = {
                name: fallbackName,
                email: inviteForm.email.trim(),
                role: inviteForm.role,
                roleClass: tone,
                initial: fallbackName[0]?.toUpperCase() || 'U',
                grad: ROLE_GRADIENTS[tone],
              }

              setUsers((prev) => [user, ...prev])
              setShowInviteModal(false)
              setInviteForm(INITIAL_INVITE_FORM)
              setFlashMessage(`Invitation prepared for ${user.email}.`)
            }}
          >
            <div className="form-header">
              <div>
                <div className="form-title">Invite Team User</div>
                <div className="form-subtitle">Create invitation with a predefined role and access scope.</div>
              </div>
              <button
                type="button"
                className="btn-ghost"
                style={{ width: 32, height: 32, borderRadius: 16, padding: 0, justifyContent: 'center' }}
                onClick={() => setShowInviteModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="form-grid form-grid-2">
              <div className="form-field">
                <label className="form-label" htmlFor="settings-invite-name">Name</label>
                <input
                  id="settings-invite-name"
                  className="form-control"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Alex Petrov"
                  autoFocus
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="settings-invite-role">Role</label>
                <select
                  id="settings-invite-role"
                  className="form-control"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, role: e.target.value }))}
                >
                  <option value="Network Admin">Network Admin</option>
                  <option value="Affiliate Manager">Affiliate Manager</option>
                  <option value="Team Lead">Team Lead</option>
                  <option value="Media Buyer">Media Buyer</option>
                  <option value="Finance Manager">Finance Manager</option>
                </select>
              </div>

              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" htmlFor="settings-invite-email">Work Email</label>
                <input
                  id="settings-invite-email"
                  type="email"
                  className="form-control"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={() => setShowInviteModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={!inviteForm.email.trim()}>
                Send Invite
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function roleToneFromLabel(role: string): RoleTone {
  const normalized = role.toLowerCase()
  if (normalized.includes('admin')) return 'blue'
  if (normalized.includes('finance')) return 'amber'
  if (normalized.includes('buyer')) return 'rose'
  if (normalized.includes('lead')) return 'purple'
  if (normalized.includes('affiliate')) return 'purple'
  return 'emerald'
}
