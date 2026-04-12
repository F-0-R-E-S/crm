import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import clsx from 'clsx'

interface Broker {
  id: string
  name: string
  status: string
  endpoint: string
  daily_cap: number
  total_cap: number
  country_caps?: Record<string, number>
  priority: number
  template_id?: string
  created_at: string
}

export default function BrokersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['brokers'],
    queryFn: () => api.get<{ brokers: Broker[] }>('/internal/rules').then(() =>
      ({ brokers: [] as Broker[] })
    ).catch(() => ({ brokers: [] as Broker[] })),
  })

  const brokers = data?.brokers ?? []

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Brokers</h2>
          <p className="text-sm text-gray-500 mt-1">{brokers.length} broker{brokers.length !== 1 ? 's' : ''} configured</p>
        </div>
        <button className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700">Add Broker</button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-white rounded-xl border animate-pulse" />)}
        </div>
      ) : brokers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-4xl mb-3">🏢</p>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No brokers configured</h3>
          <p className="text-sm text-gray-500 mb-4">Add your first broker integration to start delivering leads.</p>
          <button className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700">Add First Broker</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brokers.map((broker) => (
            <div key={broker.id} className={clsx('bg-white rounded-xl border p-5',
              broker.status === 'active' ? 'border-gray-200' : 'border-red-200')}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{broker.name}</h3>
                <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium',
                  broker.status === 'active' ? 'bg-green-100 text-green-700' :
                  broker.status === 'paused' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}>
                  {broker.status}
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Daily Cap</span>
                  <span className="font-medium">{broker.daily_cap > 0 ? broker.daily_cap : '∞'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Priority</span>
                  <span className="font-medium">{broker.priority}</span>
                </div>
                <div className="flex justify-between">
                  <span>Endpoint</span>
                  <span className="font-mono text-xs truncate max-w-[200px]">{broker.endpoint}</span>
                </div>
              </div>
              {broker.daily_cap > 0 && (
                <div className="mt-3">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: '0%' }} />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">0 / {broker.daily_cap} today</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
