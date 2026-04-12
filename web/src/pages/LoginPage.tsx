import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { api } from '../lib/api'

type Mode = 'login' | 'register'

interface LoginResponse {
  token: string
  refresh_token: string
  expires_at: string
  user: { id: string; email: string; name: string; role: string }
}

interface RegisterResponse {
  token: string
  refresh_token: string
  user: { id: string; email: string; name: string; role: string }
  tenant: { id: string; name: string }
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 12,
  padding: '11px 14px',
  fontSize: 14,
  color: 'rgba(255,255,255,0.95)',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s, box-shadow 0.2s',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: 'rgba(255,255,255,0.50)', marginBottom: 7,
  textTransform: 'uppercase', letterSpacing: '0.07em',
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [showRecovery, setShowRecovery] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')

  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryToken, setRecoveryToken] = useState('')
  const [newRecoveryPassword, setNewRecoveryPassword] = useState('')
  const [confirmRecoveryPassword, setConfirmRecoveryPassword] = useState('')
  const [recoveryMessage, setRecoveryMessage] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuthStore()
  const navigate = useNavigate()

  function switchMode(m: Mode) {
    setMode(m)
    setShowRecovery(false)
    setError('')
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post<LoginResponse>('/auth/login', { email, password })
      login(res.token, res.refresh_token, res.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
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
      const res = await api.post<RegisterResponse>('/auth/register', {
        email,
        password,
        name,
        company_name: companyName,
      })
      register(res.token, res.refresh_token, res.user, res.tenant)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSendReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setRecoveryMessage('')
    setLoading(true)

    try {
      const res = await api.post<{ message: string; reset_token?: string }>('/auth/forgot-password', { email: recoveryEmail })
      if (res.reset_token) {
        setRecoveryToken(res.reset_token)
      }
      setRecoveryMessage(res.message || 'If account exists, reset instructions were sent.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request reset')
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setRecoveryMessage('')

    if (newRecoveryPassword !== confirmRecoveryPassword) {
      setError('Passwords do not match')
      return
    }

    if (newRecoveryPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const res = await api.post<{ message: string }>('/auth/reset-password', {
        token: recoveryToken,
        new_password: newRecoveryPassword,
      })
      setRecoveryMessage(res.message || 'Password reset successfully')
      setShowRecovery(false)
      setMode('login')
      setPassword('')
      setConfirmPassword('')
      setRecoveryToken('')
      setNewRecoveryPassword('')
      setConfirmRecoveryPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-deep)', position: 'relative', overflow: 'hidden',
    }}>
      <div className="aurora">
        <div className="aurora-orb aurora-orb-1" />
        <div className="aurora-orb aurora-orb-2" />
        <div className="aurora-orb aurora-orb-3" />
      </div>

      <div style={{
        position: 'relative', zIndex: 1,
        background: 'rgba(13,21,38,0.85)',
        backdropFilter: 'blur(32px) saturate(180%)',
        WebkitBackdropFilter: 'blur(32px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 28,
        padding: 40, width: '100%', maxWidth: 440,
        boxShadow: '0 40px 100px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        animation: 'slide-up 0.4s cubic-bezier(.4,0,.2,1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 800, color: '#fff',
            boxShadow: '0 0 24px rgba(79,172,254,0.45)',
          }}>G</div>
          <div>
            <div style={{
              fontSize: 18, fontWeight: 700,
              background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>GambChamp CRM</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              {showRecovery ? 'Recover account access' : mode === 'login' ? 'Sign in to your workspace' : 'Create a new workspace'}
            </div>
          </div>
        </div>

        {!showRecovery && (
          <div style={{
            display: 'flex', gap: 4, padding: 4,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, marginBottom: 28,
          }}>
            {(['login', 'register'] as Mode[]).map((m) => (
              <button key={m} type="button" onClick={() => switchMode(m)} style={{
                flex: 1, padding: '9px 0',
                borderRadius: 9, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: mode === m ? 'rgba(255,255,255,0.10)' : 'transparent',
                color: mode === m ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.40)',
                boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,0.25)' : 'none',
                transition: 'all 0.2s',
              }}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(248,113,113,0.10)',
            border: '1px solid rgba(248,113,113,0.22)',
            borderRadius: 10, padding: '10px 14px',
            fontSize: 13, color: '#f87171', marginBottom: 18,
          }}>{error}</div>
        )}

        {recoveryMessage && (
          <div style={{
            background: 'rgba(52,211,153,0.10)',
            border: '1px solid rgba(52,211,153,0.25)',
            borderRadius: 10, padding: '10px 14px',
            fontSize: 13, color: '#34d399', marginBottom: 18,
          }}>{recoveryMessage}</div>
        )}

        {showRecovery ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <form onSubmit={handleSendReset} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Account Email</label>
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  style={inputStyle}
                  placeholder="you@company.com"
                  required
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(79,172,254,0.45)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79,172,254,0.12)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
              <button type="submit" disabled={loading || !recoveryEmail.trim()} className="btn-glass" style={{ justifyContent: 'center' }}>
                {loading ? 'Sending…' : 'Send Reset Token'}
              </button>
            </form>

            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Reset Token</label>
                <input
                  value={recoveryToken}
                  onChange={(e) => setRecoveryToken(e.target.value)}
                  style={inputStyle}
                  placeholder="Paste token from email"
                  required
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(79,172,254,0.45)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79,172,254,0.12)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
              <div>
                <label style={labelStyle}>New Password</label>
                <input
                  type="password"
                  value={newRecoveryPassword}
                  onChange={(e) => setNewRecoveryPassword(e.target.value)}
                  style={inputStyle}
                  placeholder="Minimum 8 characters"
                  required
                  minLength={8}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(79,172,254,0.45)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79,172,254,0.12)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
              <div>
                <label style={labelStyle}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmRecoveryPassword}
                  onChange={(e) => setConfirmRecoveryPassword(e.target.value)}
                  style={inputStyle}
                  required
                  minLength={8}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(79,172,254,0.45)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79,172,254,0.12)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>

              <button type="submit" disabled={loading || !recoveryToken.trim()} className="btn-primary" style={{ justifyContent: 'center' }}>
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>

            <button
              type="button"
              className="btn-ghost"
              style={{ justifyContent: 'center' }}
              onClick={() => {
                setShowRecovery(false)
                setError('')
                setRecoveryMessage('')
              }}
            >
              Back to Sign In
            </button>
          </div>
        ) : mode === 'login' ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                style={inputStyle} required
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(79,172,254,0.45)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79,172,254,0.12)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.boxShadow = 'none' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                style={inputStyle} required
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(79,172,254,0.45)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79,172,254,0.12)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.boxShadow = 'none' }}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              style={{ justifyContent: 'center' }}
              onClick={() => {
                setShowRecovery(true)
                setError('')
              }}
            >
              Forgot password?
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Full Name', val: name, set: setName, type: 'text', ph: 'Alex Petrov' },
              { label: 'Company Name', val: companyName, set: setCompanyName, type: 'text', ph: 'Acme Corp' },
              { label: 'Email', val: email, set: setEmail, type: 'email', ph: '' },
              { label: 'Password', val: password, set: setPassword, type: 'password', ph: 'Min 8 chars' },
              { label: 'Confirm', val: confirmPassword, set: setConfirmPassword, type: 'password', ph: '' },
            ].map((f) => (
              <div key={f.label}>
                <label style={labelStyle}>{f.label}</label>
                <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)}
                  placeholder={f.ph} style={inputStyle} required minLength={f.type === 'password' ? 8 : undefined}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(79,172,254,0.45)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79,172,254,0.12)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
            ))}
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Creating…' : 'Create Account →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
