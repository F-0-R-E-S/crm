import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { api } from '../lib/api'

interface Broker {
  id: string
  name: string
  status: string
  daily_cap: number
  priority: number
}

interface RuleCondition {
  countries?: string[]
}

interface RuleTarget {
  broker_id: string
  weight?: number
}

interface Rule {
  id: string
  name: string
  priority: number
  is_active: boolean
  conditions: RuleCondition
  broker_targets: RuleTarget[]
  algorithm: string
  daily_cap: number
  total_cap: number
  created_at: string
}

interface CapPrediction {
  broker_id: string
  broker_name: string
  daily_cap: number
  current_used: number
  hours_remaining: number
  predicted_exhaust_at: string | null
}

interface RuleFormState {
  name: string
  priority: number
  algorithm: 'weighted_round_robin' | 'priority' | 'slots_chance'
  countries: string
  primaryBrokerId: string
  fallbackBrokerId: string
  primaryWeight: number
  dailyCap: number
  totalCap: number
}

const INITIAL_FORM: RuleFormState = {
  name: '',
  priority: 1,
  algorithm: 'weighted_round_robin',
  countries: 'US, CA',
  primaryBrokerId: '',
  fallbackBrokerId: '',
  primaryWeight: 70,
  dailyCap: 0,
  totalCap: 0,
}

export default function RoutingPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [flashMessage, setFlashMessage] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [form, setForm] = useState<RuleFormState>(INITIAL_FORM)

  const { data: rulesData, isLoading: loadingRules } = useQuery({
    queryKey: ['routing-rules'],
    queryFn: () => api.get<{ rules: Rule[]; total: number }>('/rules'),
  })

  const { data: brokersData } = useQuery({
    queryKey: ['brokers'],
    queryFn: () => api.get<{ brokers: Broker[]; total: number }>('/brokers'),
  })

  const { data: capsData } = useQuery({
    queryKey: ['smart-cap-predictions'],
    queryFn: () => api.get<{ predictions: CapPrediction[]; source: string }>('/smart-routing/cap-predictions')
      .catch(() => ({ predictions: [] as CapPrediction[], source: 'error' })),
    refetchInterval: 30000,
  })

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post<Rule>('/rules', payload),
    onSuccess: (rule) => {
      setFlashMessage(`Rule "${rule.name}" created.`)
      closeModal()
      void queryClient.invalidateQueries({ queryKey: ['routing-rules'] })
    },
    onError: (error) => {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create rule')
    },
  })

  const rules = rulesData?.rules ?? []
  const brokers = brokersData?.brokers ?? []
  const capPredictions = capsData?.predictions ?? []

  function getBrokerName(brokerId: string) {
    return brokers.find((broker) => broker.id === brokerId)?.name || brokerId.slice(0, 8)
  }

  function closeModal() {
    setShowCreate(false)
    setSubmitError('')
    setForm({
      ...INITIAL_FORM,
      primaryBrokerId: brokers[0]?.id ?? '',
      fallbackBrokerId: brokers[1]?.id ?? '',
      priority: rules.length + 1,
    })
  }

  function openCreate() {
    setFlashMessage('')
    setSubmitError('')
    setForm({
      ...INITIAL_FORM,
      primaryBrokerId: brokers[0]?.id ?? '',
      fallbackBrokerId: brokers[1]?.id ?? '',
      priority: rules.length + 1,
    })
    setShowCreate(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')

    const countries = form.countries
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean)

    const targets: RuleTarget[] = []
    if (form.primaryBrokerId) {
      targets.push({ broker_id: form.primaryBrokerId, weight: form.primaryWeight })
    }
    if (form.fallbackBrokerId && form.fallbackBrokerId !== form.primaryBrokerId) {
      targets.push({ broker_id: form.fallbackBrokerId, weight: Math.max(0, 100 - form.primaryWeight) })
    }

    createMutation.mutate({
      name: form.name.trim(),
      priority: form.priority,
      is_active: true,
      algorithm: form.algorithm,
      conditions: countries.length ? { countries } : {},
      broker_targets: targets,
      daily_cap: form.dailyCap,
      total_cap: form.totalCap,
    })
  }

  const activeBrokers = brokers.filter((broker) => broker.status === 'active')

  return (
    <div className="page-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Routing Rules</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            {rules.length} live rules · {activeBrokers.length} active brokers
          </p>
        </div>
        <button className="btn-primary" style={{ fontSize: 12, padding: '8px 18px' }} onClick={openCreate}>
          + Create Rule
        </button>
      </div>

      {flashMessage && (
        <div className="form-alert form-alert-success" style={{ marginBottom: 16 }}>
          {flashMessage}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Live Rules', value: rules.length, color: '#4facfe' },
          { label: 'Active Brokers', value: activeBrokers.length, color: '#34d399' },
          { label: 'Cap Signals', value: capPredictions.length, color: '#fbbf24' },
        ].map((item) => (
          <div key={item.label} className="glass-card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: item.color, marginTop: 6 }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, marginBottom: 20 }}>
        <div className="glass-card">
          <div className="section-label">Distribution Rules</div>
          {loadingRules ? (
            <div style={{ color: 'var(--text-3)' }}>Loading rules...</div>
          ) : rules.length === 0 ? (
            <div style={{ color: 'var(--text-3)' }}>No routing rules configured yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rules.map((rule) => (
                <div key={rule.id} style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>#{rule.priority}</span>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{rule.name}</div>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
                        Countries: {rule.conditions?.countries?.length ? rule.conditions.countries.join(', ') : 'all'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                        {rule.broker_targets.map((target) => `${getBrokerName(target.broker_id)}${typeof target.weight === 'number' ? ` (${target.weight}%)` : ''}`).join(' -> ')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={clsx('status-badge', rule.is_active ? 'delivered' : 'invalid')}>
                        {rule.algorithm}
                      </span>
                      {(rule.daily_cap > 0 || rule.total_cap > 0) && (
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                          {rule.daily_cap > 0 ? `daily ${rule.daily_cap}` : null}
                          {rule.daily_cap > 0 && rule.total_cap > 0 ? ' · ' : null}
                          {rule.total_cap > 0 ? `total ${rule.total_cap}` : null}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card">
          <div className="section-label">Cap Predictions</div>
          {capPredictions.length === 0 ? (
            <div style={{ color: 'var(--text-3)' }}>
              Live cap predictions are unavailable until smart-routing has broker usage data.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {capPredictions.map((prediction) => {
                const pct = prediction.daily_cap > 0 ? (prediction.current_used / prediction.daily_cap) * 100 : 0
                return (
                  <div key={prediction.broker_id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{prediction.broker_name || getBrokerName(prediction.broker_id)}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                        {prediction.current_used} / {prediction.daily_cap}
                      </span>
                    </div>
                    <div className="score-track">
                      <div
                        className="score-fill"
                        style={{
                          width: `${Math.min(100, pct)}%`,
                          background: pct > 90 ? 'var(--grad-rose)' : pct > 70 ? 'linear-gradient(135deg,#fbbf24,#f59e0b)' : 'var(--grad-blue)',
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                      {prediction.hours_remaining < 0
                        ? 'No prediction yet'
                        : prediction.hours_remaining === 0
                          ? 'Cap exhausted'
                          : `${prediction.hours_remaining}h remaining`}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="glass-card">
        <div className="section-label">Broker Priority</div>
        {brokers.length === 0 ? (
          <div style={{ color: 'var(--text-3)' }}>No brokers available for routing.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {brokers
              .slice()
              .sort((a, b) => a.priority - b.priority)
              .map((broker) => (
                <div key={broker.id} style={{ borderRadius: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>Priority {broker.priority}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{broker.name}</div>
                </div>
              ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <form className="modal-box" style={{ maxWidth: 760 }} onSubmit={handleSubmit}>
            <div className="form-header">
              <div>
                <div className="form-title">Create Routing Rule</div>
                <div className="form-subtitle">Rules are saved to routing-engine and used in live broker selection.</div>
              </div>
              <button
                type="button"
                className="btn-ghost"
                style={{ width: 32, height: 32, borderRadius: 16, padding: 0, justifyContent: 'center' }}
                onClick={closeModal}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {submitError && (
              <div className="form-alert form-alert-error" style={{ marginBottom: 12 }}>
                {submitError}
              </div>
            )}

            <div className="form-grid form-grid-2">
              <div className="form-field">
                <label className="form-label" htmlFor="rule-name">Rule Name</label>
                <input
                  id="rule-name"
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="US Forex Priority"
                  required
                  autoFocus
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="rule-priority">Priority</label>
                <input
                  id="rule-priority"
                  className="form-control"
                  type="number"
                  min={1}
                  value={form.priority}
                  onChange={(e) => setForm((prev) => ({ ...prev, priority: Math.max(1, Number(e.target.value) || 1) }))}
                  required
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="rule-algorithm">Algorithm</label>
                <select
                  id="rule-algorithm"
                  className="form-control"
                  value={form.algorithm}
                  onChange={(e) => setForm((prev) => ({ ...prev, algorithm: e.target.value as RuleFormState['algorithm'] }))}
                >
                  <option value="weighted_round_robin">weighted_round_robin</option>
                  <option value="priority">priority</option>
                  <option value="slots_chance">slots_chance</option>
                </select>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="rule-weight">Primary Weight (%)</label>
                <input
                  id="rule-weight"
                  className="form-control"
                  type="number"
                  min={0}
                  max={100}
                  value={form.primaryWeight}
                  onChange={(e) => setForm((prev) => ({ ...prev, primaryWeight: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                />
              </div>

              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" htmlFor="rule-countries">Countries (comma-separated)</label>
                <input
                  id="rule-countries"
                  className="form-control"
                  value={form.countries}
                  onChange={(e) => setForm((prev) => ({ ...prev, countries: e.target.value }))}
                  placeholder="US, GB, CA"
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="rule-primary">Primary Broker</label>
                <select
                  id="rule-primary"
                  className="form-control"
                  value={form.primaryBrokerId}
                  onChange={(e) => setForm((prev) => ({ ...prev, primaryBrokerId: e.target.value }))}
                  required
                >
                  <option value="">Select broker</option>
                  {brokers.map((broker) => (
                    <option key={broker.id} value={broker.id}>{broker.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="rule-fallback">Fallback Broker</label>
                <select
                  id="rule-fallback"
                  className="form-control"
                  value={form.fallbackBrokerId}
                  onChange={(e) => setForm((prev) => ({ ...prev, fallbackBrokerId: e.target.value }))}
                >
                  <option value="">No fallback</option>
                  {brokers.map((broker) => (
                    <option key={broker.id} value={broker.id}>{broker.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="rule-daily-cap">Daily Cap</label>
                <input
                  id="rule-daily-cap"
                  className="form-control"
                  type="number"
                  min={0}
                  value={form.dailyCap}
                  onChange={(e) => setForm((prev) => ({ ...prev, dailyCap: Math.max(0, Number(e.target.value) || 0) }))}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="rule-total-cap">Total Cap</label>
                <input
                  id="rule-total-cap"
                  className="form-control"
                  type="number"
                  min={0}
                  value={form.totalCap}
                  onChange={(e) => setForm((prev) => ({ ...prev, totalCap: Math.max(0, Number(e.target.value) || 0) }))}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={createMutation.isPending || !form.name.trim() || !form.primaryBrokerId}>
                {createMutation.isPending ? 'Creating...' : 'Create Rule'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
