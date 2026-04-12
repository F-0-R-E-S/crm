import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'
import clsx from 'clsx'

interface WeightRecommendation {
  broker_id: string
  broker_name: string
  current_weight: number
  recommended_weight: number
  reason: string
  conversion_rate: number
  confidence: number
}

interface CapPrediction {
  broker_id: string
  broker_name: string
  daily_cap: number
  current_used: number
  velocity_per_hour: number
  predicted_exhaust_at: string | null
  hours_remaining: number
  confidence: number
}

export default function SmartRoutingPage() {
  const { data: recsData, isLoading: loadingRecs } = useQuery({
    queryKey: ['smart-recommendations'],
    queryFn: () => api.get<{ recommendations: WeightRecommendation[]; source: string }>('/smart-routing/recommendations')
      .catch(() => ({ recommendations: [] as WeightRecommendation[], source: 'error' })),
    refetchInterval: 60000,
  })

  const { data: capsData, isLoading: loadingCaps } = useQuery({
    queryKey: ['smart-cap-predictions'],
    queryFn: () => api.get<{ predictions: CapPrediction[]; source: string }>('/smart-routing/cap-predictions')
      .catch(() => ({ predictions: [] as CapPrediction[], source: 'error' })),
    refetchInterval: 30000,
  })

  const analyzeMutation = useMutation({
    mutationFn: () => api.post('/smart-routing/analyze', {}),
  })

  const recs = recsData?.recommendations ?? []
  const caps = capsData?.predictions ?? []

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Smart Routing AI</h2>
          <p className="text-sm text-gray-500 mt-1">ML-powered weight recommendations and cap predictions</p>
        </div>
        <button onClick={() => analyzeMutation.mutate()} disabled={analyzeMutation.isPending}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50">
          {analyzeMutation.isPending ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {/* Weight Recommendations */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Weight Recommendations</h3>
        {loadingRecs ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl border animate-pulse" />)}</div>
        ) : recs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500 text-sm">No recommendations available yet. Need at least 7 days of routing data.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Broker</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recommended Weight</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversion Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recs.map((rec) => (
                  <tr key={rec.broker_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm text-gray-900">{rec.broker_name || rec.broker_id.slice(0, 12)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.min(100, rec.recommended_weight / 10)}%` }} />
                        </div>
                        <span className="text-sm font-bold text-brand-700">{rec.recommended_weight}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('text-sm font-medium',
                        rec.conversion_rate >= 30 ? 'text-green-600' : rec.conversion_rate >= 15 ? 'text-yellow-600' : 'text-red-600')}>
                        {rec.conversion_rate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={clsx('w-2 h-2 rounded-full',
                          rec.confidence >= 0.8 ? 'bg-green-500' : rec.confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500')} />
                        <span className="text-sm text-gray-600">{(rec.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[250px] truncate">{rec.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cap Exhaustion Predictions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Cap Exhaustion Predictions</h3>
        {loadingCaps ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-36 bg-white rounded-xl border animate-pulse" />)}
          </div>
        ) : caps.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500 text-sm">No brokers with daily caps configured.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {caps.map((cap) => {
              const pct = cap.daily_cap > 0 ? (cap.current_used / cap.daily_cap) * 100 : 0
              const isUrgent = cap.hours_remaining >= 0 && cap.hours_remaining < 2
              const isWarning = cap.hours_remaining >= 0 && cap.hours_remaining < 4

              return (
                <div key={cap.broker_id} className={clsx('bg-white rounded-xl border p-5',
                  isUrgent ? 'border-red-300 bg-red-50/30' : isWarning ? 'border-yellow-300 bg-yellow-50/30' : 'border-gray-200')}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 text-sm">{cap.broker_name || cap.broker_id.slice(0, 12)}</h4>
                    {isUrgent && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">URGENT</span>}
                    {isWarning && !isUrgent && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">WARNING</span>}
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{cap.current_used} / {cap.daily_cap}</span>
                      <span>{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={clsx('h-full rounded-full transition-all',
                        pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500')}
                        style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Velocity</span>
                      <div className="font-medium">{cap.velocity_per_hour}/hr</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Time Remaining</span>
                      <div className={clsx('font-medium', isUrgent ? 'text-red-600' : isWarning ? 'text-yellow-600' : '')}>
                        {cap.hours_remaining < 0 ? 'N/A' : cap.hours_remaining === 0 ? 'Exhausted' : `${cap.hours_remaining}h`}
                      </div>
                    </div>
                  </div>

                  {cap.predicted_exhaust_at && cap.hours_remaining > 0 && (
                    <div className="mt-2 text-xs text-gray-400">
                      Predicted exhaustion: {new Date(cap.predicted_exhaust_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
