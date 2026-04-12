import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'

interface CreateAPIKeyResponse {
  key: string
  id: string
  tenant_id: string
  name: string
  key_prefix: string
  scopes: string[]
  is_active: boolean
  created_at: string
}

interface NotificationPrefs {
  telegram_chat_id: string
  telegram_enabled: boolean
  email_enabled: boolean
  webhook_url: string
  webhook_enabled: boolean
  event_filters: { events?: string[]; affiliates?: string[]; countries?: string[] }
}

interface UserItem {
  id: string
  email: string
  name: string
  role: string
  is_active: boolean
  created_at: string
}

interface InviteItem {
  id: string
  email: string
  role: string
  name: string
  expires_at: string
  created_at: string
}

interface RoleItem {
  role: string
  label: string
}

type SettingsTab = 'workspace' | 'apikeys' | 'notifications' | 'users'

const FALLBACK_ROLES: RoleItem[] = [
  { role: 'super_admin', label: 'Super Admin' },
  { role: 'network_admin', label: 'Network Admin' },
  { role: 'affiliate_manager', label: 'Affiliate Manager' },
  { role: 'team_lead', label: 'Team Lead' },
  { role: 'media_buyer', label: 'Media Buyer' },
  { role: 'finance_manager', label: 'Finance Manager' },
]

const INITIAL_PREFS: NotificationPrefs = {
  telegram_chat_id: '',
  telegram_enabled: false,
  email_enabled: true,
  webhook_url: '',
  webhook_enabled: false,
  event_filters: {},
}

const INITIAL_KEY_FORM = {
  name: '',
  scope: 'leads:write',
}

const INITIAL_INVITE_FORM = {
  name: '',
  email: '',
  role: 'media_buyer',
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="gl-switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="gl-slider" />
    </label>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, tenant } = useAuthStore()

  const [tab, setTab] = useState<SettingsTab>('workspace')
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [flashMessage, setFlashMessage] = useState('')
  const [keyError, setKeyError] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [prefs, setPrefs] = useState<NotificationPrefs>(INITIAL_PREFS)
  const [prefsSaved, setPrefsSaved] = useState(false)
  const [keyForm, setKeyForm] = useState(INITIAL_KEY_FORM)
  const [inviteForm, setInviteForm] = useState(INITIAL_INVITE_FORM)
  const [generatedKeys, setGeneratedKeys] = useState<CreateAPIKeyResponse[]>([])
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordError, setPasswordError] = useState('')

  const tabs = [
    { id: 'workspace' as const, label: 'Workspace' },
    { id: 'apikeys' as const, label: 'API Keys' },
    { id: 'notifications' as const, label: 'Notifications' },
    { id: 'users' as const, label: 'Users' },
  ]

  const { data: usersData } = useQuery({
    queryKey: ['users', 'settings'],
    queryFn: () => api.get<{ users: UserItem[]; total: number }>('/users?limit=8'),
  })

  const { data: invitesData } = useQuery({
    queryKey: ['invites', 'settings'],
    queryFn: () => api.get<{ invites: InviteItem[] }>('/auth/invites'),
  })

  const { data: rolesData } = useQuery({
    queryKey: ['roles', 'settings'],
    queryFn: () => api.get<{ roles: RoleItem[] }>('/roles').catch(() => ({ roles: FALLBACK_ROLES })),
  })

  const { data: prefsData } = useQuery({
    queryKey: ['notification-prefs', 'settings'],
    queryFn: () => api.get<NotificationPrefs>('/notifications/preferences'),
  })

  const { data: eventTypesData } = useQuery({
    queryKey: ['notification-event-types', 'settings'],
    queryFn: () => api.get<{ event_types: string[] }>('/notifications/event-types'),
  })

  useEffect(() => {
    if (prefsData) {
      setPrefs(prefsData)
    }
  }, [prefsData])

  const passwordMutation = useMutation({
    mutationFn: (payload: { current_password: string; new_password: string }) =>
      api.post<{ message: string }>('/auth/change-password', payload),
    onSuccess: (result) => {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordError('')
      setFlashMessage(result.message || 'Password changed successfully')
    },
    onError: (error) => {
      setPasswordError(error instanceof Error ? error.message : 'Failed to change password')
    },
  })

  const savePrefsMutation = useMutation({
    mutationFn: () => api.put<{ message: string }>('/notifications/preferences', prefs),
    onSuccess: () => {
      setPrefsSaved(true)
      setFlashMessage('Notification preferences saved')
      void queryClient.invalidateQueries({ queryKey: ['notification-prefs', 'settings'] })
      setTimeout(() => setPrefsSaved(false), 3000)
    },
  })

  const createKeyMutation = useMutation({
    mutationFn: () => api.post<CreateAPIKeyResponse>('/auth/api-keys', {
      name: keyForm.name.trim(),
      scopes: [keyForm.scope],
    }),
    onSuccess: (result) => {
      setGeneratedKeys((prev) => [result, ...prev])
      setShowKeyModal(false)
      setKeyForm(INITIAL_KEY_FORM)
      setKeyError('')
      setFlashMessage(`API key "${result.name}" generated.`)
    },
    onError: (error) => {
      setKeyError(error instanceof Error ? error.message : 'Failed to generate API key')
    },
  })

  const inviteMutation = useMutation({
    mutationFn: () => api.post<{ message: string }>('/auth/invites', {
      email: inviteForm.email.trim(),
      role: inviteForm.role,
      name: inviteForm.name.trim(),
    }),
    onSuccess: () => {
      setShowInviteModal(false)
      setInviteForm(INITIAL_INVITE_FORM)
      setInviteError('')
      setFlashMessage(`Invite sent to ${inviteForm.email.trim()}`)
      void queryClient.invalidateQueries({ queryKey: ['invites', 'settings'] })
    },
    onError: (error) => {
      setInviteError(error instanceof Error ? error.message : 'Failed to send invite')
    },
  })

  const users = usersData?.users ?? []
  const invites = invitesData?.invites ?? []
  const roleOptions = rolesData?.roles?.length ? rolesData.roles : FALLBACK_ROLES
  const eventTypes = eventTypesData?.event_types ?? []

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match')
      return
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters')
      return
    }

    passwordMutation.mutate({
      current_password: passwordForm.currentPassword,
      new_password: passwordForm.newPassword,
    })
  }

  function toggleEventType(eventType: string, checked: boolean) {
    const currentEvents = prefs.event_filters.events ?? []
    const nextEvents = checked
      ? [...currentEvents, eventType]
      : currentEvents.filter((item) => item !== eventType)

    setPrefs((prev) => ({
      ...prev,
      event_filters: {
        ...prev.event_filters,
        events: nextEvents,
      },
    }))
  }

  function getRoleLabel(role: string) {
    return roleOptions.find((item) => item.role === role)?.label || role
  }

  return (
    <div className="page-section">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Settings</h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>Backend-backed settings only. Mock-only controls removed.</p>
      </div>

      {flashMessage && (
        <div className="form-alert form-alert-success" style={{ marginBottom: 14 }}>
          {flashMessage}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: 14, width: 'fit-content', marginBottom: 24 }}>
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            style={{
              padding: '8px 18px',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'inherit',
              background: tab === item.id ? 'rgba(255,255,255,0.10)' : 'transparent',
              color: tab === item.id ? 'var(--text-1)' : 'var(--text-3)',
              boxShadow: tab === item.id ? '0 2px 8px rgba(0,0,0,0.25)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'workspace' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="glass-card">
            <div className="section-label">Workspace</div>
            <div style={{ display: 'grid', gap: 14, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Tenant</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>{tenant?.name || 'Current Workspace'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Signed In As</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>{user?.name || user?.email || 'Unknown User'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{user?.email} · {user?.role}</div>
              </div>
            </div>

            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>No fake workspace toggles</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                The previous general settings form used client-only fields and switches. Those controls were removed
                until the backend exposes real workspace configuration endpoints.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
              <button className="btn-primary" style={{ fontSize: 12, padding: '8px 16px' }} onClick={() => navigate('/settings/sessions')}>
                Open Sessions
              </button>
              <button className="btn-ghost" style={{ fontSize: 12, padding: '8px 16px' }} onClick={() => navigate('/settings/notifications')}>
                Full Notifications
              </button>
              <button className="btn-ghost" style={{ fontSize: 12, padding: '8px 16px' }} onClick={() => navigate('/users')}>
                Team Management
              </button>
            </div>
          </div>

          <div className="glass-card">
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
                  <label className="form-label" htmlFor="settings-confirm-password">Confirm Password</label>
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
                <button type="submit" className="btn-primary" disabled={passwordMutation.isPending}>
                  {passwordMutation.isPending ? 'Updating...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === 'apikeys' && (
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <div className="section-label" style={{ marginBottom: 4 }}>API Keys</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                Key generation is real. Historical list/revoke is not exposed by the current backend.
              </div>
            </div>
            <button
              className="btn-primary"
              style={{ fontSize: 12, padding: '7px 16px' }}
              onClick={() => {
                setShowKeyModal(true)
                setKeyError('')
              }}
            >
              + Generate Key
            </button>
          </div>

          {generatedKeys.length === 0 ? (
            <div style={{ padding: '18px 0', color: 'var(--text-3)' }}>
              No keys generated during this session yet.
            </div>
          ) : (
            generatedKeys.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: 12, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                    Created {format(new Date(item.created_at), 'yyyy-MM-dd HH:mm')} · {item.scopes.join(', ')}
                  </div>
                </div>
                <code style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', color: 'var(--text-2)', fontFamily: 'monospace' }}>
                  {item.key}
                </code>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'notifications' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="glass-card">
            <div className="section-label">Channels</div>

            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ paddingBottom: 14, borderBottom: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Telegram</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>Real-time alerts via Telegram bot</div>
                  </div>
                  <Switch checked={prefs.telegram_enabled} onChange={(next) => setPrefs((prev) => ({ ...prev, telegram_enabled: next }))} />
                </div>
                {prefs.telegram_enabled && (
                  <input
                    className="form-control"
                    value={prefs.telegram_chat_id}
                    onChange={(e) => setPrefs((prev) => ({ ...prev, telegram_chat_id: e.target.value }))}
                    placeholder="Telegram Chat ID"
                  />
                )}
              </div>

              <div style={{ paddingBottom: 14, borderBottom: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Email</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>Critical alerts by email</div>
                  </div>
                  <Switch checked={prefs.email_enabled} onChange={(next) => setPrefs((prev) => ({ ...prev, email_enabled: next }))} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Webhook</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>Forward events to your endpoint</div>
                  </div>
                  <Switch checked={prefs.webhook_enabled} onChange={(next) => setPrefs((prev) => ({ ...prev, webhook_enabled: next }))} />
                </div>
                {prefs.webhook_enabled && (
                  <input
                    className="form-control"
                    value={prefs.webhook_url}
                    onChange={(e) => setPrefs((prev) => ({ ...prev, webhook_url: e.target.value }))}
                    placeholder="https://your-endpoint.com/webhook"
                  />
                )}
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: 18 }}>
              <button className="btn-primary" onClick={() => savePrefsMutation.mutate()} disabled={savePrefsMutation.isPending}>
                {savePrefsMutation.isPending ? 'Saving...' : prefsSaved ? 'Saved' : 'Save Preferences'}
              </button>
            </div>
          </div>

          <div className="glass-card">
            <div className="section-label">Event Types</div>
            {eventTypes.length === 0 ? (
              <div style={{ color: 'var(--text-3)' }}>No event types available.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {eventTypes.map((eventType) => {
                  const checked = (prefs.event_filters.events ?? []).includes(eventType)
                  return (
                    <label key={eventType} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)' }}>
                      <input type="checkbox" checked={checked} onChange={(e) => toggleEventType(eventType, e.target.checked)} />
                      <span>{eventType}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div className="section-label" style={{ marginBottom: 4 }}>Team Members</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                This tab now shows real users and pending invites instead of client-only placeholders.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-ghost" style={{ fontSize: 12, padding: '7px 16px' }} onClick={() => navigate('/users')}>
                Open Full Page
              </button>
              <button
                className="btn-primary"
                style={{ fontSize: 12, padding: '7px 16px' }}
                onClick={() => {
                  setShowInviteModal(true)
                  setInviteError('')
                }}
              >
                + Invite User
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
            {users.length === 0 ? (
              <div style={{ color: 'var(--text-3)' }}>No users returned by backend.</div>
            ) : (
              users.map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{item.name || 'Unnamed User'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3 }}>{item.email}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{getRoleLabel(item.role)}</span>
                    <span className={`status-badge ${item.is_active ? 'delivered' : 'invalid'}`}>
                      {item.is_active ? 'active' : 'inactive'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="section-label">Pending Invites</div>
          {invites.length === 0 ? (
            <div style={{ color: 'var(--text-3)' }}>No pending invites.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {invites.map((invite) => (
                <div key={invite.id} style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{invite.email}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                        {getRoleLabel(invite.role)} · expires {format(new Date(invite.expires_at), 'MMM d, HH:mm')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showKeyModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowKeyModal(false)}>
          <form
            className="modal-box"
            style={{ maxWidth: 680 }}
            onSubmit={(e) => {
              e.preventDefault()
              setKeyError('')
              createKeyMutation.mutate()
            }}
          >
            <div className="form-header">
              <div>
                <div className="form-title">Generate API Key</div>
                <div className="form-subtitle">Keys are returned once by backend, so copy them from the result card.</div>
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

              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" htmlFor="api-key-scope">Scope</label>
                <select
                  id="api-key-scope"
                  className="form-control"
                  value={keyForm.scope}
                  onChange={(e) => setKeyForm((prev) => ({ ...prev, scope: e.target.value }))}
                >
                  <option value="leads:write">leads:write</option>
                  <option value="analytics:read">analytics:read</option>
                  <option value="notifications:write">notifications:write</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={() => setShowKeyModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={createKeyMutation.isPending || !keyForm.name.trim()}>
                {createKeyMutation.isPending ? 'Generating...' : 'Generate Key'}
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
              setInviteError('')
              inviteMutation.mutate()
            }}
          >
            <div className="form-header">
              <div>
                <div className="form-title">Invite Team User</div>
                <div className="form-subtitle">This uses the real invite flow from identity service.</div>
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

            {inviteError && (
              <div className="form-alert form-alert-error" style={{ marginBottom: 10 }}>
                {inviteError}
              </div>
            )}

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
                  {roleOptions.map((item) => (
                    <option key={item.role} value={item.role}>{item.label}</option>
                  ))}
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
              <button type="submit" className="btn-primary" disabled={inviteMutation.isPending || !inviteForm.email.trim()}>
                {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
