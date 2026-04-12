import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import clsx from 'clsx'

interface Scenario {
  id: string
  name: string
  is_active: boolean
  mode: string
  schedule: { timezone?: string; days?: string[]; times?: string[] }
  batch_size: number
  throttle_per_min: number
  max_attempts: number
  source_filters: { statuses?: string[]; countries?: string[]; age_days_max?: number }
  target_brokers: { broker_id: string; weight: number }[]
  overflow_pool: { broker_id: string }[]
  created_at: string
}

interface QueueStatus {
  queue_depth: number
  processing: number
  completed_24h: number
  failed_24h: number
  status: string
}

const MODES = [
  { value: 'batch', label: 'Batch', desc: 'Process leads in batches on schedule' },
  { value: 'continuous', label: 'Continuous', desc: 'Auto-enqueue failed leads immediately' },
  { value: 'scheduled', label: 'Scheduled', desc: 'Run at specific times and days' },
]

export default function UADPage() {
  const [showForm, setShowForm] = useState(false)
  const queryClient = useQueryClient()

  const { data: scenariosData, isLoading: loadingScenarios } = useQuery({
    queryKey: ['uad-scenarios'],
    queryFn: () => api.get<{ scenarios: Scenario[] }>('/uad/scenarios'),
  })

  const { data: statusData } = useQuery({
    queryKey: ['uad-status'],
    queryFn: () => api.get<QueueStatus>('/internal/uad/status').catch(() => ({
      queue_depth: 0, processing: 0, completed_24h: 0, failed_24h: 0, status: 'unknown',
    } as QueueStatus)),
    refetchInterval: 10000,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, activate }: { id: string; activate: boolean }) =>
      api.post(`/uad/scenarios/${id}/${activate ? 'activate' : 'deactivate'}`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['uad-scenarios'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/uad/scenarios/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['uad-scenarios'] }),
  })

  const scenarios = scenariosData?.scenarios ?? []
  const status = statusData || { queue_depth: 0, processing: 0, completed_24h: 0, failed_24h: 0, status: 'idle' }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Automated Lead Delivery (UAD)</h2>
          <p className="text-sm text-gray-500 mt-1">Scenario-based lead redistribution engine</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700">
          Create Scenario
        </button>
      </div>

      {/* Queue Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Queue Depth', value: status.queue_depth, color: 'blue' },
          { label: 'Processing', value: status.processing, color: 'yellow' },
          { label: 'Completed (24h)', value: status.completed_24h, color: 'green' },
          { label: 'Failed (24h)', value: status.failed_24h, color: 'red' },
          { label: 'Engine', value: status.status, color: status.status === 'processing' ? 'green' : 'gray' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
            <div className={clsx('text-2xl font-bold', `text-${stat.color}-600`)}>
              {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Scenarios */}
      {loadingScenarios ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-32 bg-white rounded-xl border animate-pulse" />)}</div>
      ) : scenarios.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-4xl mb-3">🔄</p>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No UAD scenarios</h3>
          <p className="text-sm text-gray-500 mb-4">Create a scenario to automatically redistribute rejected or cold leads.</p>
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700">Create First Scenario</button>
        </div>
      ) : (
        <div className="space-y-3">
          {scenarios.map((sc) => {
            const mode = MODES.find(m => m.value === sc.mode)
            return (
              <div key={sc.id} className={clsx('bg-white rounded-xl border p-5', sc.is_active ? 'border-gray-200' : 'border-gray-300 bg-gray-50/50')}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={clsx('w-2.5 h-2.5 rounded-full mt-1', sc.is_active ? 'bg-green-500' : 'bg-gray-400')} />
                    <div>
                      <h3 className="font-semibold text-gray-900">{sc.name}</h3>
                      <div className="flex gap-2 mt-1 text-xs text-gray-500">
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded">{mode?.label || sc.mode}</span>
                        <span>Batch: {sc.batch_size}</span>
                        <span>|</span>
                        <span>Max retries: {sc.max_attempts}</span>
                        <span>|</span>
                        <span>Throttle: {sc.throttle_per_min}/min</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleMutation.mutate({ id: sc.id, activate: !sc.is_active })}
                      className={clsx('px-3 py-1.5 text-sm rounded-lg border',
                        sc.is_active ? 'border-orange-300 text-orange-600 hover:bg-orange-50' : 'border-green-300 text-green-600 hover:bg-green-50')}>
                      {sc.is_active ? 'Pause' : 'Activate'}
                    </button>
                    <button
                      onClick={() => { if (confirm('Delete this scenario?')) deleteMutation.mutate(sc.id) }}
                      className="px-3 py-1.5 text-sm rounded-lg border border-red-300 text-red-600 hover:bg-red-50">
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="text-xs text-gray-500">Source Statuses</div>
                    <div className="font-medium">{sc.source_filters?.statuses?.join(', ') || 'All'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="text-xs text-gray-500">Countries</div>
                    <div className="font-medium">{sc.source_filters?.countries?.join(', ') || 'All'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="text-xs text-gray-500">Max Lead Age</div>
                    <div className="font-medium">{sc.source_filters?.age_days_max ? `${sc.source_filters.age_days_max} days` : '∞'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="text-xs text-gray-500">Target Brokers</div>
                    <div className="font-medium">{sc.target_brokers?.length || 0} + {sc.overflow_pool?.length || 0} overflow</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <ScenarioForm onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['uad-scenarios'] }) }} />
      )}
    </div>
  )
}

function ScenarioForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [mode, setMode] = useState('batch')
  const [batchSize, setBatchSize] = useState(100)
  const [throttle, setThrottle] = useState(50)
  const [maxAttempts, setMaxAttempts] = useState(3)
  const [statuses, setStatuses] = useState('rejected, no_answer')
  const [countries, setCountries] = useState('')
  const [ageDays, setAgeDays] = useState(30)
  const [targetsJson, setTargetsJson] = useState('[{"broker_id":"","weight":100}]')

  const mutation = useMutation({
    mutationFn: (data: object) => api.post('/uad/scenarios', data),
    onSuccess: onSaved,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    let targets: object[]
    try { targets = JSON.parse(targetsJson) } catch { alert('Invalid JSON'); return }

    mutation.mutate({
      name, mode, batch_size: batchSize, throttle_per_min: throttle, max_attempts: maxAttempts,
      source_filters: {
        statuses: statuses.split(',').map(s => s.trim()).filter(Boolean),
        countries: countries ? countries.split(',').map(c => c.trim().toUpperCase()) : undefined,
        age_days_max: ageDays > 0 ? ageDays : undefined,
      },
      target_brokers: targets,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Create UAD Scenario</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="p-5 space-y-4">
          <div><label className="block text-sm font-medium mb-1">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map(m => (
                <label key={m.value} className={clsx('p-3 rounded-lg border cursor-pointer text-center',
                  mode === m.value ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:bg-gray-50')}>
                  <input type="radio" name="mode" value={m.value} checked={mode === m.value}
                    onChange={() => setMode(m.value)} className="sr-only" />
                  <div className="text-sm font-medium">{m.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{m.desc}</div>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-sm font-medium mb-1">Batch Size</label>
              <input type="number" value={batchSize} onChange={e => setBatchSize(+e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Throttle/min</label>
              <input type="number" value={throttle} onChange={e => setThrottle(+e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Max Retries</label>
              <input type="number" value={maxAttempts} onChange={e => setMaxAttempts(+e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Source Statuses (comma-separated)</label>
            <input value={statuses} onChange={e => setStatuses(e.target.value)} placeholder="rejected, no_answer, cold"
              className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">Countries</label>
              <input value={countries} onChange={e => setCountries(e.target.value)} placeholder="US, GB" className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Max Lead Age (days)</label>
              <input type="number" value={ageDays} onChange={e => setAgeDays(+e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Target Brokers (JSON)</label>
            <textarea value={targetsJson} onChange={e => setTargetsJson(e.target.value)} rows={3}
              className="w-full px-3 py-2 border rounded-lg text-sm font-mono" /></div>
        </div>
        <div className="p-5 border-t flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm disabled:opacity-50">
            {mutation.isPending ? 'Creating...' : 'Create Scenario'}</button>
        </div>
        {mutation.isError && <div className="px-5 pb-4 text-sm text-red-600">{mutation.error instanceof Error ? mutation.error.message : 'Failed'}</div>}
      </form>
    </div>
  )
}
