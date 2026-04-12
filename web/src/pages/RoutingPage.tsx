import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import clsx from 'clsx'

interface BrokerTarget { broker_id: string; weight: number }

interface DistributionRule {
  id: string
  name: string
  priority: number
  is_active: boolean
  conditions: Record<string, unknown>
  broker_targets: BrokerTarget[]
  algorithm: string
  daily_cap: number
  total_cap: number
  country_caps?: Record<string, number>
  timezone_slots?: { timezone: string; days?: string[]; start: string; end: string }[]
  created_at: string
}

const ALGORITHMS = [
  { value: 'weighted_round_robin', label: 'Weighted Round-Robin', desc: 'Stateful distribution proportional to weight' },
  { value: 'priority', label: 'Priority (Waterfall)', desc: 'First available broker wins' },
  { value: 'slots_chance', label: 'Slots / Chance', desc: 'Probability-based per-lead selection' },
]

export default function RoutingPage() {
  const [showForm, setShowForm] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['routing-rules'],
    queryFn: () => api.get<{ rules: DistributionRule[] }>('/internal/rules'),
  })

  const rules = data?.rules ?? []

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Routing Rules</h2>
          <p className="text-sm text-gray-500 mt-1">{rules.length} rule{rules.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700">Create Rule</button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-white rounded-xl border animate-pulse" />)}</div>
      ) : rules.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-4xl mb-3">🔀</p>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No routing rules yet</h3>
          <p className="text-sm text-gray-500 mb-4">Create your first rule to start distributing leads to brokers.</p>
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700">Create First Rule</button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => {
            const algo = ALGORITHMS.find(a => a.value === rule.algorithm)
            const cond = (rule.conditions || {}) as Record<string, unknown>
            const countries = (cond.countries as string[]) || []
            return (
              <div key={rule.id} className={clsx('bg-white rounded-xl border p-5', rule.is_active ? 'border-gray-200' : 'border-orange-200 bg-orange-50/30')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={clsx('w-2.5 h-2.5 rounded-full', rule.is_active ? 'bg-green-500' : 'bg-orange-400')} />
                    <div>
                      <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                      <div className="flex gap-2 mt-1 text-xs text-gray-500">
                        <span>P{rule.priority}</span>
                        <span>|</span>
                        <span>{algo?.label || rule.algorithm}</span>
                        <span>|</span>
                        <span>{(rule.broker_targets || []).length} brokers</span>
                        {countries.length > 0 && <><span>|</span><span>{countries.join(', ')}</span></>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <span className="px-2 py-1 bg-gray-100 rounded">Cap: {rule.daily_cap > 0 ? rule.daily_cap + '/day' : '∞'}</span>
                    {rule.total_cap > 0 && <span className="px-2 py-1 bg-gray-100 rounded">Total: {rule.total_cap}</span>}
                  </div>
                </div>
                {(rule.broker_targets || []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {rule.broker_targets.map((t, i) => (
                      <span key={i} className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded text-xs font-mono">
                        {t.broker_id.slice(0,8)}… w:{t.weight}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <RuleForm onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['routing-rules'] }) }} />
      )}
    </div>
  )
}

function RuleForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [priority, setPriority] = useState(10)
  const [algorithm, setAlgorithm] = useState('weighted_round_robin')
  const [dailyCap, setDailyCap] = useState(0)
  const [totalCap, setTotalCap] = useState(0)
  const [countries, setCountries] = useState('')
  const [targetsJson, setTargetsJson] = useState('[{"broker_id":"","weight":100}]')

  const mutation = useMutation({
    mutationFn: (data: object) => api.post('/internal/rules', data),
    onSuccess: onSaved,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    let targets: BrokerTarget[]
    try { targets = JSON.parse(targetsJson) } catch { alert('Invalid JSON'); return }
    const conditions: Record<string, unknown> = {}
    if (countries.trim()) conditions.countries = countries.split(',').map(c => c.trim().toUpperCase())

    mutation.mutate({ name, priority, algorithm, is_active: true, daily_cap: dailyCap, total_cap: totalCap, conditions, broker_targets: targets })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Create Routing Rule</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="p-5 space-y-4">
          <div><label className="block text-sm font-medium mb-1">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-sm font-medium mb-1">Priority</label>
              <input type="number" value={priority} onChange={e => setPriority(+e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Daily Cap</label>
              <input type="number" value={dailyCap} onChange={e => setDailyCap(+e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Total Cap</label>
              <input type="number" value={totalCap} onChange={e => setTotalCap(+e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Algorithm</label>
            <select value={algorithm} onChange={e => setAlgorithm(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
              {ALGORITHMS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select></div>
          <div><label className="block text-sm font-medium mb-1">Countries (comma-separated)</label>
            <input value={countries} onChange={e => setCountries(e.target.value)} placeholder="US, GB, DE" className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Broker Targets (JSON)</label>
            <textarea value={targetsJson} onChange={e => setTargetsJson(e.target.value)} rows={4}
              className="w-full px-3 py-2 border rounded-lg text-sm font-mono" /></div>
        </div>
        <div className="p-5 border-t flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm disabled:opacity-50">
            {mutation.isPending ? 'Creating...' : 'Create Rule'}</button>
        </div>
        {mutation.isError && <div className="px-5 pb-4 text-sm text-red-600">{mutation.error instanceof Error ? mutation.error.message : 'Failed'}</div>}
      </form>
    </div>
  )
}
