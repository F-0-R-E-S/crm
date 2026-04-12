import { useAuthStore } from '../stores/auth'

const BASE_URL = '/api/v1'

let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

async function tryRefreshToken(): Promise<boolean> {
  const { refreshToken, setTokens, logout } = useAuthStore.getState()
  if (!refreshToken) {
    logout()
    return false
  }

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!res.ok) {
      logout()
      return false
    }

    const data = await res.json()
    setTokens(data.token, data.refresh_token)
    return true
  } catch {
    logout()
    return false
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    // Skip refresh for auth endpoints to avoid loops
    if (path.startsWith('/auth/')) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error?.message || body.message || 'Unauthorized')
    }

    // Coalesce concurrent refresh attempts into one
    if (!isRefreshing) {
      isRefreshing = true
      refreshPromise = tryRefreshToken().finally(() => {
        isRefreshing = false
        refreshPromise = null
      })
    }

    const refreshed = await (refreshPromise ?? Promise.resolve(false))

    if (refreshed) {
      // Retry original request with new token
      const newToken = useAuthStore.getState().token
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`
      }
      const retryRes = await fetch(`${BASE_URL}${path}`, { ...options, headers })
      if (!retryRes.ok) {
        const body = await retryRes.json().catch(() => ({}))
        throw new Error(body.error?.message || body.message || `Request failed: ${retryRes.status}`)
      }
      return retryRes.json()
    }

    // Refresh failed — redirect to login
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error?.message || body.message || `Request failed: ${res.status}`)
  }

  return res.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
