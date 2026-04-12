import { useState, useEffect } from 'react'
import { api } from '../lib/api'

interface FraudProfile {
  affiliate_id: string
  ip_check: boolean
  email_check: boolean
  phone_check: boolean
  velocity_check: boolean
  blacklist_check: boolean
  vpn_check: boolean
  voip_check: boolean
  bot_check: boolean
  min_quality_score: number
  auto_reject_score: number
  preset: string
}

const PRESETS = ['strict', 'standard', 'lenient']

export default function FraudProfilesPage() {
  const [profiles, setProfiles] = useState<FraudProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<FraudProfile>>({})
  const [saveError, setSaveError] = useState('')

  const fetchProfiles = () => {
    setLoading(true)
    api
      .get<FraudProfile[]>('/fraud/profiles')
      .then(setProfiles)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchProfiles()
  }, [])

  const startEdit = (profile: FraudProfile) => {
    setEditingId(profile.affiliate_id)
    setEditForm({ ...profile })
    setSaveError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
    setSaveError('')
  }

  const saveEdit = () => {
    if (!editingId) return
    setSaveError('')
    api
      .put(`/fraud/profiles/${editingId}`, editForm)
      .then(() => {
        setEditingId(null)
        setEditForm({})
        fetchProfiles()
      })
      .catch((err) => setSaveError(err instanceof Error ? err.message : 'Save failed'))
  }

  const toggleStyle = (enabled: boolean): React.CSSProperties => ({
    width: 36,
    height: 20,
    borderRadius: 10,
    border: 'none',
    background: enabled ? '#4facfe' : 'var(--glass-border)',
    position: 'relative',
    cursor: 'pointer',
    transition: 'background 0.2s',
  })

  const toggleDot = (enabled: boolean): React.CSSProperties => ({
    position: 'absolute',
    top: 3,
    left: enabled ? 19 : 3,
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: '#fff',
    transition: 'left 0.2s',
  })

  return (
    <div className="page-section">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Fraud Profiles</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            Configure fraud detection rules per affiliate
          </p>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)', fontSize: 14 }}>
          Loading profiles...
        </div>
      )}

      {!loading && profiles.length === 0 && (
        <div
          style={{
            background: 'var(--glass-light)',
            border: '1px solid var(--glass-border)',
            borderRadius: 20,
            padding: '40px',
            textAlign: 'center',
            color: 'var(--text-3)',
            fontSize: 14,
          }}
        >
          No fraud profiles configured yet
        </div>
      )}

      {!loading && profiles.map((profile) => (
        <div
          key={profile.affiliate_id}
          style={{
            background: 'var(--glass-light)',
            backdropFilter: 'var(--blur-md)',
            WebkitBackdropFilter: 'var(--blur-md)',
            border: '1px solid var(--glass-border)',
            borderRadius: 20,
            padding: '24px',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                Affiliate: <span style={{ fontFamily: 'monospace' }}>{profile.affiliate_id.slice(0, 12)}...</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                Preset: {profile.preset}
              </div>
            </div>
            {editingId !== profile.affiliate_id ? (
              <button
                onClick={() => startEdit(profile)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 12,
                  border: '1px solid var(--glass-border)',
                  background: 'var(--glass-light)',
                  color: 'var(--text-1)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Edit
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={cancelEdit}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 12,
                    border: '1px solid var(--glass-border)',
                    background: 'var(--glass-light)',
                    color: 'var(--text-2)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 12,
                    border: 'none',
                    background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
              </div>
            )}
          </div>

          {editingId === profile.affiliate_id ? (
            <div>
              {/* Preset selector */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Preset</label>
                <select
                  value={editForm.preset || 'standard'}
                  onChange={(e) => setEditForm({ ...editForm, preset: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--glass-border)',
                    background: 'var(--glass-light)',
                    color: 'var(--text-1)',
                    fontSize: 13,
                    outline: 'none',
                  }}
                >
                  {PRESETS.map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>

              {/* Check toggles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                {(
                  [
                    { key: 'ip_check', label: 'IP Check' },
                    { key: 'email_check', label: 'Email Check' },
                    { key: 'phone_check', label: 'Phone Check' },
                    { key: 'velocity_check', label: 'Velocity Check' },
                    { key: 'blacklist_check', label: 'Blacklist Check' },
                    { key: 'vpn_check', label: 'VPN Check' },
                    { key: 'voip_check', label: 'VOIP Check' },
                    { key: 'bot_check', label: 'Bot Check' },
                  ] as const
                ).map(({ key, label }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, [key]: !editForm[key] })}
                      style={toggleStyle(!!editForm[key])}
                    >
                      <div style={toggleDot(!!editForm[key])} />
                    </button>
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Score inputs */}
              <div style={{ display: 'flex', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Min Quality Score</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editForm.min_quality_score ?? 0}
                    onChange={(e) => setEditForm({ ...editForm, min_quality_score: Number(e.target.value) })}
                    style={{
                      width: 100,
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1px solid var(--glass-border)',
                      background: 'var(--glass-light)',
                      color: 'var(--text-1)',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Auto Reject Score</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editForm.auto_reject_score ?? 0}
                    onChange={(e) => setEditForm({ ...editForm, auto_reject_score: Number(e.target.value) })}
                    style={{
                      width: 100,
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1px solid var(--glass-border)',
                      background: 'var(--glass-light)',
                      color: 'var(--text-1)',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {saveError && (
                <div style={{ marginTop: 12, fontSize: 12, color: '#f87171' }}>{saveError}</div>
              )}
            </div>
          ) : (
            <div>
              {/* Read-only view */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                {(
                  [
                    { key: 'ip_check', label: 'IP' },
                    { key: 'email_check', label: 'Email' },
                    { key: 'phone_check', label: 'Phone' },
                    { key: 'velocity_check', label: 'Velocity' },
                    { key: 'blacklist_check', label: 'Blacklist' },
                    { key: 'vpn_check', label: 'VPN' },
                    { key: 'voip_check', label: 'VOIP' },
                    { key: 'bot_check', label: 'Bot' },
                  ] as const
                ).map(({ key, label }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: profile[key] ? '#34d399' : 'var(--glass-border)',
                      }}
                    />
                    <span style={{ fontSize: 12, color: profile[key] ? 'var(--text-1)' : 'var(--text-3)' }}>{label}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 24, fontSize: 12, color: 'var(--text-2)' }}>
                <span>Min Quality: <strong style={{ color: 'var(--text-1)' }}>{profile.min_quality_score}</strong></span>
                <span>Auto Reject: <strong style={{ color: '#f87171' }}>{profile.auto_reject_score}</strong></span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
