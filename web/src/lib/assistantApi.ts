import { useAuthStore } from '../stores/auth'

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const BASE_URL = `${API_BASE}/v1/assistant`

function getHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export interface AssistantSession {
  id: string
  tenant_id: string
  user_id: string
  title: string
  model: string
  total_input_tokens: number
  total_output_tokens: number
  message_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AssistantMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'tool_use' | 'tool_result'
  content: string
  tool_name?: string
  tool_input?: Record<string, unknown>
  tool_result?: Record<string, unknown>
  created_at: string
}

export const assistantApi = {
  createSession: async (): Promise<AssistantSession> => {
    const res = await fetch(`${BASE_URL}/sessions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({}),
    })
    if (!res.ok) throw new Error('Failed to create session')
    return res.json()
  },

  listSessions: async (): Promise<{ sessions: AssistantSession[] }> => {
    const res = await fetch(`${BASE_URL}/sessions`, {
      headers: getHeaders(),
    })
    if (!res.ok) throw new Error('Failed to list sessions')
    return res.json()
  },

  getSession: async (id: string): Promise<{ session: AssistantSession; messages: AssistantMessage[] }> => {
    const res = await fetch(`${BASE_URL}/sessions/${id}`, {
      headers: getHeaders(),
    })
    if (!res.ok) throw new Error('Failed to get session')
    return res.json()
  },

  deleteSession: async (id: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/sessions/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    if (!res.ok) throw new Error('Failed to delete session')
  },

  sendMessage: (sessionId: string, message: string, confirmationToken?: string) => {
    return fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        session_id: sessionId,
        message,
        confirmation_token: confirmationToken,
      }),
    })
  },

  getWSUrl: (sessionId?: string): string => {
    const wsBase = BASE_URL.replace(/^http/, 'ws')
    const params = sessionId ? `?session_id=${sessionId}` : ''
    return `${wsBase}/ws${params}`
  },
}
