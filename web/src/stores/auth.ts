import { create } from 'zustand'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface Tenant {
  id: string
  name: string
}

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: User | null
  tenant: Tenant | null
  isAuthenticated: boolean
  login: (token: string, refreshToken: string, user: User, tenant?: Tenant | null) => void
  register: (token: string, refreshToken: string, user: User, tenant: Tenant) => void
  setTokens: (token: string, refreshToken: string) => void
  setUser: (user: User | null) => void
  logout: () => void
}

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const BASE_URL = `${API_BASE}/v1`

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refresh_token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  tenant: JSON.parse(localStorage.getItem('tenant') || 'null'),
  isAuthenticated: !!localStorage.getItem('token'),

  login: (token, refreshToken, user, tenant = null) => {
    localStorage.setItem('token', token)
    localStorage.setItem('refresh_token', refreshToken)
    localStorage.setItem('user', JSON.stringify(user))
    if (tenant) {
      localStorage.setItem('tenant', JSON.stringify(tenant))
    }
    set({ token, refreshToken, user, tenant, isAuthenticated: true })
  },

  register: (token, refreshToken, user, tenant) => {
    localStorage.setItem('token', token)
    localStorage.setItem('refresh_token', refreshToken)
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('tenant', JSON.stringify(tenant))
    set({ token, refreshToken, user, tenant, isAuthenticated: true })
  },

  setTokens: (token, refreshToken) => {
    localStorage.setItem('token', token)
    localStorage.setItem('refresh_token', refreshToken)
    set({ token, refreshToken })
  },

  setUser: (user) => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
    } else {
      localStorage.removeItem('user')
    }
    set({ user })
  },

  logout: () => {
    const refreshToken = get().refreshToken

    if (refreshToken) {
      void fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }).catch(() => {
        // ignore remote logout errors on client-side cleanup
      })
    }

    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    localStorage.removeItem('tenant')
    set({ token: null, refreshToken: null, user: null, tenant: null, isAuthenticated: false })
  },
}))
