import { useEffect, useState } from 'react'
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

interface NewTargetBroker {
  broker_id: string
  weight: number
}

const MODES = [
  { value: 'batch', label: 'Batch', desc: 'Process leads in batches on schedule' },
  { value: 'continuous', label: 'Continuous', desc: 'Auto-enqueue failed leads immediately' },
  { value: 'scheduled', label: 'Scheduled', desc: 'Run at specific times and days' },
]

export default function UADPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: scenariosData, isLoading: loadingScenarios } = useQuery({
    queryKey: ['uad-scenarios'],
    queryFn: () => api.get<{ scenarios: Scenario[] }>('/uad/scenarios'),
  })

  const { data: statusData } = useQuery({
    queryKey: ['uad-status'],
    queryFn: () => api.get<QueueStatus>('/internal/uad/status').catch(() => ({
      queue_depth: 0,
      processing: 0,
      completed_24h: 0,
      failed_24h: 0,
      status: 'unknown',
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

  const { data: editScenarioData, isLoading: loadingEditScenario } = useQuery({
    queryKey: ['uad-scenario', editingScenarioId],
    queryFn: () => api.get<Scenario>(`/uad/scenarios/${editingScenarioId}`),
    enabled: Boolean(editingScenarioId),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, unknown> }) =>
      api.put(`/uad/scenarios/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uad-scenarios'] })
      queryClient.invalidateQueries({ queryKey: ['uad-scenario', editingScenarioId] })
      setEditingScenarioId(null)
    },
  })

  const scenarios = scenariosData?.scenarios ?? []
  const status = statusData || {
    queue_depth: 0,
    processing: 0,
    completed_24h: 0,
    failed_24h: 0,
    status: 'idle',
  }

  const statCards: Array<{ label: string; value: number | string; color: string }> = [
    { label: 'Queue Depth', value: status.queue_depth, color: '#4facfe' },
    { label: 'Processing', value: status.processing, color: '#fbbf24' },
    { label: 'Completed (24h)', value: status.completed_24h, color: '#34d399' },
    { label: 'Failed (24h)', value: status.failed_24h, color: '#f87171' },
    {
      label: 'Engine',
      value: status.status,
      color: status.status === 'processing' || status.status === 'active' ? '#34d399' : 'var(--text-2)',
    },
  ]

  return (
    <div className="page-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>
            Automated Lead Delivery (UAD)
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            Scenario-based lead redistribution engine
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="btn-primary"
          style={{ fontSize: 12, padding: '8px 16px' }}
        >
          + Create Scenario
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 18 }}>
        {statCards.map((stat) => (
          <div key={stat.label} className="glass-card" style={{ padding: '14px 14px 13px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 5, color: stat.color }}>
              {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
            </div>
          </div>
        ))}
      </div>

      {loadingScenarios ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {[1, 2].map((i) => (
            <div key={i} className="glass-card" style={{ height: 124, opacity: 0.7 }} />
          ))}
        </div>
      ) : scenarios.length === 0 ? (
        <div className="glass-card" style={{ padding: 34, textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 10 }}>🔄</p>
          <h3 style={{ fontSize: 19, color: 'var(--text-1)', fontWeight: 600, marginBottom: 6 }}>No UAD scenarios yet</h3>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
            Create a scenario to automatically redistribute rejected or cold leads.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary" style={{ fontSize: 12 }}>
            Create First Scenario
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {scenarios.map((sc) => {
            const mode = MODES.find((m) => m.value === sc.mode)
            return (
              <div
                key={sc.id}
                className="glass-card"
                style={{
                  padding: 18,
                  opacity: sc.is_active ? 1 : 0.78,
                  borderColor: sc.is_active ? 'var(--glass-border)' : 'rgba(255,255,255,0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: '50%',
                          background: sc.is_active ? '#34d399' : 'var(--text-3)',
                          boxShadow: sc.is_active ? '0 0 8px rgba(52,211,153,0.7)' : 'none',
                        }}
                      />
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)' }}>{sc.name}</h3>
                      <span className={clsx('status-badge', sc.is_active ? 'delivered' : 'invalid')}>
                        {sc.is_active ? 'active' : 'paused'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                      <span className="btn-ghost" style={{ cursor: 'default', padding: '4px 10px' }}>
                        Mode: {mode?.label || sc.mode}
                      </span>
                      <span className="btn-ghost" style={{ cursor: 'default', padding: '4px 10px' }}>
                        Batch: {sc.batch_size}
                      </span>
                      <span className="btn-ghost" style={{ cursor: 'default', padding: '4px 10px' }}>
                        Retries: {sc.max_attempts}
                      </span>
                      <span className="btn-ghost" style={{ cursor: 'default', padding: '4px 10px' }}>
                        Throttle: {sc.throttle_per_min}/min
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => setEditingScenarioId(sc.id)}
                      className="btn-glass"
                      style={{ fontSize: 12, padding: '7px 12px' }}
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => toggleMutation.mutate({ id: sc.id, activate: !sc.is_active })}
                      className="btn-ghost"
                      style={{
                        fontSize: 12,
                        padding: '7px 12px',
                        color: sc.is_active ? '#fbbf24' : '#34d399',
                        borderColor: sc.is_active ? 'rgba(251,191,36,0.35)' : 'rgba(52,211,153,0.35)',
                      }}
                    >
                      {sc.is_active ? 'Pause' : 'Activate'}
                    </button>

                    <button
                      onClick={() => {
                        if (confirm('Delete this scenario?')) {
                          deleteMutation.mutate(sc.id)
                        }
                      }}
                      className="btn-danger"
                      style={{ fontSize: 12, padding: '7px 12px' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 14 }}>
                  <InfoTile label="Source Statuses" value={sc.source_filters?.statuses?.join(', ') || 'All'} />
                  <InfoTile label="Countries" value={sc.source_filters?.countries?.join(', ') || 'All'} />
                  <InfoTile
                    label="Max Lead Age"
                    value={sc.source_filters?.age_days_max ? `${sc.source_filters.age_days_max} days` : 'Unlimited'}
                  />
                  <InfoTile
                    label="Target Brokers"
                    value={`${sc.target_brokers?.length || 0} + ${sc.overflow_pool?.length || 0} overflow`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <ScenarioForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            queryClient.invalidateQueries({ queryKey: ['uad-scenarios'] })
          }}
        />
      )}

      {editingScenarioId && (
        <QuickEditScenarioModal
          scenario={editScenarioData}
          loading={loadingEditScenario}
          saving={updateMutation.isPending}
          error={updateMutation.error instanceof Error ? updateMutation.error.message : ''}
          onClose={() => setEditingScenarioId(null)}
          onSave={(updates) => updateMutation.mutate({ id: editingScenarioId, updates })}
        />
      )}
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12,
      padding: '9px 10px',
      minWidth: 0,
    }}>
      <div style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-1)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {value}
      </div>
    </div>
  )
}

function QuickEditScenarioModal({
  scenario,
  loading,
  saving,
  error,
  onClose,
  onSave,
}: {
  scenario?: Scenario
  loading: boolean
  saving: boolean
  error: string
  onClose: () => void
  onSave: (updates: Record<string, unknown>) => void
}) {
  const [name, setName] = useState('')
  const [mode, setMode] = useState('batch')
  const [batchSize, setBatchSize] = useState(100)
  const [throttle, setThrottle] = useState(50)
  const [maxAttempts, setMaxAttempts] = useState(3)

  useEffect(() => {
    if (!scenario) return
    setName(scenario.name)
    setMode(scenario.mode)
    setBatchSize(scenario.batch_size)
    setThrottle(scenario.throttle_per_min)
    setMaxAttempts(scenario.max_attempts)
  }, [scenario])

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className="modal-box"
        style={{ maxWidth: 680 }}
        onSubmit={(e) => {
          e.preventDefault()
          onSave({
            name: name.trim(),
            mode,
            batch_size: batchSize,
            throttle_per_min: throttle,
            max_attempts: maxAttempts,
          })
        }}
      >
        <div className="form-header">
          <div>
            <div className="form-title">Edit Scenario</div>
            <div className="form-subtitle">Quick update for core distribution parameters.</div>
          </div>
          <button
            type="button"
            className="btn-ghost"
            style={{ width: 32, height: 32, borderRadius: 16, padding: 0, justifyContent: 'center' }}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {loading && (
          <div style={{ padding: '22px 0', color: 'var(--text-2)', fontSize: 13 }}>
            Loading scenario...
          </div>
        )}

        {!loading && scenario && (
          <div className="form-grid form-grid-2">
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label" htmlFor="uad-edit-name">Name</label>
              <input
                id="uad-edit-name"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="uad-edit-mode">Mode</label>
              <select
                id="uad-edit-mode"
                className="form-control"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="uad-edit-batch">Batch Size</label>
              <input
                id="uad-edit-batch"
                type="number"
                min={1}
                className="form-control"
                value={batchSize}
                onChange={(e) => setBatchSize(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="uad-edit-throttle">Throttle / Min</label>
              <input
                id="uad-edit-throttle"
                type="number"
                min={1}
                className="form-control"
                value={throttle}
                onChange={(e) => setThrottle(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="uad-edit-retries">Max Retries</label>
              <input
                id="uad-edit-retries"
                type="number"
                min={1}
                className="form-control"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="form-alert form-alert-error" style={{ marginTop: 14 }}>
            {error}
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading || saving || !name.trim()}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
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
  const [targetsJson, setTargetsJson] = useState('[{"broker_id":"broker_primary","weight":100}]')
  const [jsonError, setJsonError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: object) => api.post('/uad/scenarios', data),
    onSuccess: onSaved,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    let targets: NewTargetBroker[]
    try {
      const parsed = JSON.parse(targetsJson)
      if (!Array.isArray(parsed)) {
        throw new Error('Target brokers must be an array')
      }

      targets = parsed.map((item) => ({
        broker_id: String(item?.broker_id || '').trim(),
        weight: Number(item?.weight || 0),
      })).filter((item) => item.broker_id.length > 0 && item.weight > 0)

      if (targets.length === 0) {
        throw new Error('At least one valid broker target is required')
      }

      setJsonError('')
    } catch {
      setJsonError('Target Brokers JSON is invalid. Example: [{"broker_id":"broker_a","weight":100}]')
      return
    }

    mutation.mutate({
      name,
      mode,
      batch_size: batchSize,
      throttle_per_min: throttle,
      max_attempts: maxAttempts,
      source_filters: {
        statuses: statuses.split(',').map((s) => s.trim()).filter(Boolean),
        countries: countries ? countries.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean) : undefined,
        age_days_max: ageDays > 0 ? ageDays : undefined,
      },
      target_brokers: targets,
    })
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={handleSubmit} className="modal-box" style={{ maxWidth: 840 }}>
        <div className="form-header">
          <div>
            <div className="form-title">Create UAD Scenario</div>
            <div className="form-subtitle">
              Configure redistribution logic for rejected, stale, or no-answer leads.
            </div>
          </div>
          <button
            type="button"
            className="btn-ghost"
            style={{ width: 32, height: 32, borderRadius: 16, padding: 0, justifyContent: 'center' }}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {mutation.isError && (
          <div className="form-alert form-alert-error" style={{ marginBottom: 14 }}>
            {mutation.error instanceof Error ? mutation.error.message : 'Failed to create scenario'}
          </div>
        )}

        {jsonError && (
          <div className="form-alert form-alert-error" style={{ marginBottom: 14 }}>
            {jsonError}
          </div>
        )}

        <div className="form-grid" style={{ gap: 16 }}>
          <div className="form-field">
            <label className="form-label" htmlFor="uad-name">Scenario Name</label>
            <input
              id="uad-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="form-control"
              placeholder="Recovery EU Tier-1"
              autoFocus
            />
          </div>

          <div className="form-field">
            <label className="form-label">Mode</label>
            <div className="form-grid form-grid-3">
              {MODES.map((m) => {
                const selected = mode === m.value
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMode(m.value)}
                    style={{
                      textAlign: 'left',
                      borderRadius: 12,
                      padding: '11px 12px',
                      border: `1px solid ${selected ? 'rgba(79,172,254,0.45)' : 'var(--glass-border)'}`,
                      background: selected ? 'rgba(79,172,254,0.12)' : 'rgba(255,255,255,0.03)',
                      color: 'var(--text-1)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.35 }}>{m.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="form-grid form-grid-3">
            <div className="form-field">
              <label className="form-label" htmlFor="uad-batch">Batch Size</label>
              <input
                id="uad-batch"
                type="number"
                min={1}
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value) || 1)}
                className="form-control"
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="uad-throttle">Throttle / Min</label>
              <input
                id="uad-throttle"
                type="number"
                min={1}
                value={throttle}
                onChange={(e) => setThrottle(Number(e.target.value) || 1)}
                className="form-control"
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="uad-attempts">Max Retries</label>
              <input
                id="uad-attempts"
                type="number"
                min={1}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value) || 1)}
                className="form-control"
              />
            </div>
          </div>

          <div className="form-grid form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="uad-statuses">Source Statuses</label>
              <input
                id="uad-statuses"
                value={statuses}
                onChange={(e) => setStatuses(e.target.value)}
                className="form-control"
                placeholder="rejected, no_answer, cold"
              />
              <div className="form-help">Comma-separated list. Leave empty to include all statuses.</div>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="uad-countries">Countries</label>
              <input
                id="uad-countries"
                value={countries}
                onChange={(e) => setCountries(e.target.value)}
                className="form-control"
                placeholder="US, GB, DE"
              />
              <div className="form-help">ISO alpha-2 codes, comma-separated.</div>
            </div>
          </div>

          <div className="form-grid form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="uad-age">Max Lead Age (Days)</label>
              <input
                id="uad-age"
                type="number"
                min={0}
                value={ageDays}
                onChange={(e) => setAgeDays(Math.max(0, Number(e.target.value) || 0))}
                className="form-control"
              />
              <div className="form-help">Set 0 to disable lead age filtering.</div>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="uad-targets">Target Brokers (JSON)</label>
              <textarea
                id="uad-targets"
                value={targetsJson}
                onChange={(e) => setTargetsJson(e.target.value)}
                rows={4}
                className="form-control"
                style={{ fontFamily: 'SF Mono, Menlo, Consolas, monospace', fontSize: 12 }}
              />
              <div className="form-help">
                {'Example: [{"broker_id":"broker_a","weight":60},{"broker_id":"broker_b","weight":40}]'}
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={mutation.isPending || !name.trim()} className="btn-primary">
            {mutation.isPending ? 'Creating…' : 'Create Scenario'}
          </button>
        </div>
      </form>
    </div>
  )
}
