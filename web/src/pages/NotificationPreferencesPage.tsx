import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

interface Prefs {
  telegram_chat_id: string
  telegram_enabled: boolean
  email_enabled: boolean
  webhook_url: string
  webhook_enabled: boolean
  event_filters: { events?: string[]; affiliates?: string[]; countries?: string[] }
}

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<Prefs>({
    telegram_chat_id: '', telegram_enabled: false,
    email_enabled: true, webhook_url: '', webhook_enabled: false,
    event_filters: {},
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const { data: eventTypes } = useQuery({
    queryKey: ['event-types'],
    queryFn: () => api.get<{ event_types: string[] }>('/notifications/event-types'),
  })

  const { data: prefsData } = useQuery({
    queryKey: ['notification-prefs'],
    queryFn: () => api.get<Prefs>('/notifications/preferences'),
  })

  useEffect(() => {
    if (prefsData) setPrefs(prefsData)
  }, [prefsData])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await api.put('/notifications/preferences', prefs)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { /* ignore */ }
    setSaving(false)
  }

  const allEvents = eventTypes?.event_types || []

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Notification Preferences</h2>

      {saved && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-sm">Preferences saved</div>
      )}

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Telegram</h3>
              <p className="text-sm text-gray-500">Receive alerts via Telegram bot</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={prefs.telegram_enabled}
                onChange={(e) => setPrefs({ ...prefs, telegram_enabled: e.target.checked })}
                className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600" />
            </label>
          </div>
          {prefs.telegram_enabled && (
            <input type="text" value={prefs.telegram_chat_id}
              onChange={(e) => setPrefs({ ...prefs, telegram_chat_id: e.target.value })}
              placeholder="Telegram Chat ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 text-sm" />
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Email</h3>
              <p className="text-sm text-gray-500">Receive critical alerts by email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={prefs.email_enabled}
                onChange={(e) => setPrefs({ ...prefs, email_enabled: e.target.checked })}
                className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600" />
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Webhook</h3>
              <p className="text-sm text-gray-500">Send events to your endpoint</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={prefs.webhook_enabled}
                onChange={(e) => setPrefs({ ...prefs, webhook_enabled: e.target.checked })}
                className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600" />
            </label>
          </div>
          {prefs.webhook_enabled && (
            <input type="url" value={prefs.webhook_url}
              onChange={(e) => setPrefs({ ...prefs, webhook_url: e.target.value })}
              placeholder="https://your-endpoint.com/webhook"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 text-sm" />
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Types ({allEvents.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {allEvents.map((et) => (
              <label key={et} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                <span className="truncate">{et.replace(/\./g, ' ')}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button onClick={handleSave} disabled={saving}
          className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  )
}
