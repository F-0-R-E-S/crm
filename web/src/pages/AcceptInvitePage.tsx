import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { api } from '../lib/api'

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const res = await api.post<{
        token: string
        refresh_token: string
        user: { id: string; email: string; name: string; role: string }
      }>('/auth/accept-invite', { token, password, name })
      login(res.token, res.refresh_token, res.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div className="aurora">
          <div className="aurora-orb aurora-orb-1" />
          <div className="aurora-orb aurora-orb-2" />
          <div className="aurora-orb aurora-orb-3" />
        </div>

        <div className="form-shell" style={{ position: 'relative', zIndex: 1, maxWidth: 420, width: '100%' }}>
          <div style={{ fontSize: 22, marginBottom: 10 }}>⚠</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>Invalid Invite</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>
            This invite link is invalid or has expired.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: 16 }}>
      <div className="aurora">
        <div className="aurora-orb aurora-orb-1" />
        <div className="aurora-orb aurora-orb-2" />
        <div className="aurora-orb aurora-orb-3" />
      </div>

      <div className="form-shell" style={{ position: 'relative', zIndex: 1, maxWidth: 460, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: 'linear-gradient(135deg,#4facfe,#00f2fe)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
          }}>
            G
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>Join GambChamp CRM</h1>
            <p style={{ color: 'var(--text-2)', fontSize: 12, marginTop: 2 }}>Set up your account to get started</p>
          </div>
        </div>

        {error && <div className="form-alert form-alert-error" style={{ marginBottom: 12 }}>{error}</div>}

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-field">
            <label className="form-label" htmlFor="invite-name">Your Name</label>
            <input
              id="invite-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-control"
              required
              autoFocus
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="invite-password">Password</label>
            <input
              id="invite-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="form-control"
              required
              minLength={8}
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="invite-confirm-password">Confirm Password</label>
            <input
              id="invite-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-control"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          >
            {loading ? 'Setting up…' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
