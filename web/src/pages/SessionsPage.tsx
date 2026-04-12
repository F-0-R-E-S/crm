import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { format } from 'date-fns'

interface Session {
  id: string
  ip: string
  user_agent: string
  device_name: string
  last_active_at: string
  expires_at: string
  created_at: string
  current: boolean
}

export default function SessionsPage() {
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get<{ sessions: Session[] }>('/auth/sessions'),
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/sessions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  })

  const revokeAllMutation = useMutation({
    mutationFn: () => api.delete('/auth/sessions'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  })

  const sessions = data?.sessions || []

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Active Sessions</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your active sessions across devices</p>
        </div>
        {sessions.length > 1 && (
          <button
            onClick={() => revokeAllMutation.mutate()}
            disabled={revokeAllMutation.isPending}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50"
          >
            Revoke All Other
          </button>
        )}
      </div>

      <div className="space-y-3">
        {sessions.map((s) => (
          <div
            key={s.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
                {s.device_name === 'Mobile' ? '\u{1F4F1}' : s.device_name === 'Tablet' ? '\u{1F4F1}' : '\u{1F4BB}'}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {s.device_name || 'Unknown Device'}
                  {s.current && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Current
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  IP: {s.ip || 'Unknown'} &middot; Last active: {format(new Date(s.last_active_at), 'MMM d, HH:mm')}
                </div>
                <div className="text-xs text-gray-400 mt-0.5 truncate max-w-md">
                  {s.user_agent}
                </div>
              </div>
            </div>
            {!s.current && (
              <button
                onClick={() => revokeMutation.mutate(s.id)}
                disabled={revokeMutation.isPending}
                className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs hover:bg-gray-50"
              >
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
