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
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
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

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    localStorage.removeItem('tenant')
    set({ token: null, refreshToken: null, user: null, tenant: null, isAuthenticated: false })
  },
}))
