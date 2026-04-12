import { create } from 'zustand'
import { api } from '../lib/api'

interface Notification {
  id: string
  channel: string
  event_type: string
  title: string
  body: string
  is_read: boolean
  sent_at: string | null
  created_at: string
}

interface NotificationState {
  items: Notification[]
  unreadCount: number
  loading: boolean
  fetch: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  unreadCount: 0,
  loading: false,

  fetch: async () => {
    set({ loading: true })
    try {
      const res = await api.get<{ data: Notification[]; total: number }>('/notifications?limit=20')
      const items = res.data || []
      set({ items, unreadCount: items.filter((n) => !n.is_read).length, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  markRead: async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`, {})
      set({
        items: get().items.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
        unreadCount: Math.max(0, get().unreadCount - 1),
      })
    } catch { /* ignore */ }
  },

  markAllRead: async () => {
    try {
      await api.post('/notifications/read-all', {})
      set({
        items: get().items.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      })
    } catch { /* ignore */ }
  },
}))
