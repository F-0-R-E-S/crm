import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { api } from '../lib/api'
import clsx from 'clsx'

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

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuthStore()
  const navigate = useNavigate()

  function switchMode(newMode: Mode) {
    setMode(newMode)
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">GambChamp CRM</h1>
        <p className="text-gray-500 mb-6">
          {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
        </p>

        {/* Mode toggle */}
        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={clsx(
              'flex-1 py-2 text-sm font-medium rounded-md transition-colors',
              mode === 'login'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={clsx(
              'flex-1 py-2 text-sm font-medium rounded-md transition-colors',
              mode === 'register'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Corp"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
                minLength={8}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
