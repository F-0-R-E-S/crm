import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import StatusBadge from '../components/StatusBadge'

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  country: string
  status: string
  fraud_score?: number
  created_at: string
}

interface LeadsResponse {
  leads: Lead[]
  total: number
  limit: number
  offset: number
}

interface CreateLeadRequest {
  first_name: string
  last_name: string
  email: string
  phone: string
  country: string
}

interface AnalyticsDashboardResponse {
  kpi: {
    leads_today: number
    leads_week: number
    leads_month: number
    conversion_rate: number
    avg_delivery_ms: number
    fraud_rate: number
    top_country: string
    active_brokers: number
    active_affiliates: number
    revenue: number
  }
  period: string
  updated_at: string
}

const KPI_CONFIGS = [
  {
    key: 'total',
    label: 'Total Leads',
    desc: 'All time',
    icon: '👤',
    color: '#4facfe',
    glow: 'rgba(79,172,254,0.15)',
    delta: '+12.4%',
    up: true,
  },
  {
    key: 'new',
    label: 'New Today',
    desc: 'Latest batch',
    icon: '📥',
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.15)',
    delta: '+8.1%',
    up: true,
  },
  {
    key: 'delivered',
    label: 'Leads Week',
    desc: 'Latest batch',
    icon: '✓',
    color: '#34d399',
    glow: 'rgba(52,211,153,0.15)',
    delta: '+3.7%',
    up: true,
  },
  {
    key: 'fraud',
    label: 'Fraud Rate',
    desc: 'Latest batch',
    icon: '🛡',
    color: '#f87171',
    glow: 'rgba(248,113,113,0.15)',
    delta: '-0.3%',
    up: false,
  },
]

const INITIAL_LEAD: CreateLeadRequest = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  country: 'US',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showLeadModal, setShowLeadModal] = useState(false)
  const [newLead, setNewLead] = useState<CreateLeadRequest>(INITIAL_LEAD)
  const [leadError, setLeadError] = useState('')
  const [leadSuccess, setLeadSuccess] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-leads'],
    queryFn: () => api.get<LeadsResponse>('/leads?limit=6&offset=0'),
  })

  const { data: analyticsData } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: () => api.get<AnalyticsDashboardResponse>('/analytics/dashboard'),
    refetchInterval: 60_000,
  })

  const createLeadMutation = useMutation({
    mutationFn: (payload: CreateLeadRequest) => api.post('/leads', payload),
    onSuccess: () => {
      setLeadError('')
      setLeadSuccess('Lead created and sent to intake queue.')
      setShowLeadModal(false)
      setNewLead(INITIAL_LEAD)
      queryClient.invalidateQueries({ queryKey: ['dashboard-leads'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
    onError: (err) => {
      setLeadError(err instanceof Error ? err.message : 'Failed to create lead')
    },
  })

  const total = data?.total ?? 0
  const leads = data?.leads ?? []
  const delivered = leads.filter((l) => l.status === 'delivered').length
  const newLeads = leads.filter((l) => l.status === 'new').length
  const avgFraud = leads.length > 0
    ? Math.round(leads.reduce((a, l) => a + (l.fraud_score ?? 0), 0) / leads.length)
    : 0

  const analytics = analyticsData?.kpi

  const kpiValues: Record<string, string> = {
    total: analytics ? analytics.leads_month.toLocaleString() : total.toString(),
    new: analytics ? analytics.leads_today.toLocaleString() : newLeads.toString(),
    delivered: analytics ? analytics.leads_week.toLocaleString() : delivered.toString(),
    fraud: analytics ? `${analytics.fraud_rate.toFixed(1)}%` : (avgFraud ? `${avgFraud}%` : '--'),
  }

  const canSubmitLead = Boolean(
    newLead.first_name.trim() &&
    newLead.email.trim() &&
    newLead.phone.trim() &&
    newLead.country.trim()
  )

  return (
    <div className="page-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            {format(new Date(), "EEEE, MMMM d · 'UTC+3'")}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-glass" style={{ fontSize: 12, padding: '7px 14px' }}>⬇ Export</button>
          <button
            className="btn-primary"
            style={{ fontSize: 12, padding: '7px 16px' }}
            onClick={() => {
              setLeadError('')
              setShowLeadModal(true)
            }}
          >
            + New Lead
          </button>
        </div>
      </div>

      {leadSuccess && (
        <div className="form-alert form-alert-success" style={{ marginBottom: 16 }}>
          {leadSuccess}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {KPI_CONFIGS.map((cfg) => (
          <div key={cfg.key} className="kpi-card">
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 'var(--r-xl)',
              background: `radial-gradient(circle at 85% 15%, ${cfg.glow}, transparent 65%)`,
              pointerEvents: 'none',
            }} />

            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: cfg.glow,
              boxShadow: `0 0 16px ${cfg.glow}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, marginBottom: 14,
            }}>{cfg.icon}</div>

            {isLoading ? (
              <div style={{ height: 36, width: 80, borderRadius: 8, background: 'var(--glass-bright)', marginBottom: 6, animation: 'pulse 1.5s infinite' }} />
            ) : (
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -1, color: 'var(--text-1)' }}>
                {kpiValues[cfg.key]}
              </div>
            )}

            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{cfg.label}</div>

            <div style={{
              position: 'absolute', top: 16, right: 16,
              fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
              background: cfg.up ? 'rgba(52,211,153,0.14)' : 'rgba(248,113,113,0.14)',
              color: cfg.up ? '#34d399' : '#f87171',
            }}>{cfg.delta}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div className="section-label" style={{ margin: 0 }}>Recent Leads</div>
            <button
              onClick={() => navigate('/leads')}
              style={{ fontSize: 12, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
            >
              View all →
            </button>
          </div>

          {error && (
            <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#f87171', marginBottom: 12 }}>
              {error instanceof Error ? error.message : 'Failed to load leads'}
            </div>
          )}

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--glass-bright)' }} />
                  <div style={{ flex: 1, height: 14, borderRadius: 7, background: 'var(--glass-bright)' }} />
                  <div style={{ width: 60, height: 22, borderRadius: 11, background: 'var(--glass-bright)' }} />
                </div>
              ))}
            </div>
          ) : leads.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-3)', padding: '16px 0' }}>
              No leads yet. Send your first lead via the API.
            </p>
          ) : (
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Country</th>
                  <th>Status</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} onClick={() => navigate('/leads')}>
                    <td className="td-primary">{lead.first_name} {lead.last_name}</td>
                    <td>{lead.country}</td>
                    <td><StatusBadge status={lead.status} /></td>
                    <td>
                      <span style={{
                        fontWeight: 600,
                        color: (lead.fraud_score ?? 0) >= 70 ? '#34d399'
                          : (lead.fraud_score ?? 0) >= 50 ? '#fbbf24' : '#f87171',
                      }}>
                        {lead.fraud_score ?? '--'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <div className="section-label">Platform Health</div>

          {[
            { label: 'Lead Delivery Rate', val: 89, color: '#34d399' },
            { label: 'Fraud Block Rate', val: 11, color: '#f87171' },
            { label: 'Broker Uptime', val: 97, color: '#4facfe' },
            { label: 'API Success Rate', val: 99, color: '#a78bfa' },
          ].map((stat) => (
            <div key={stat.label} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{stat.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: stat.color }}>{stat.val}%</span>
              </div>
              <div className="score-track">
                <div className="score-fill" style={{ width: `${stat.val}%`, background: stat.color }} />
              </div>
            </div>
          ))}

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--glass-border)' }}>
            <div className="section-label">Active Brokers</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['AlphaFX Pro', 'TradingHub', 'ForexDirect', 'BinaryWorld'].map((b) => (
                <span key={b} style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 999,
                  background: 'rgba(52,211,153,0.12)', color: '#34d399',
                  border: '1px solid rgba(52,211,153,0.2)',
                }}>● {b}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showLeadModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowLeadModal(false)}>
          <form
            className="modal-box"
            style={{ maxWidth: 700 }}
            onSubmit={(e) => {
              e.preventDefault()
              setLeadError('')
              createLeadMutation.mutate({
                first_name: newLead.first_name.trim(),
                last_name: newLead.last_name.trim(),
                email: newLead.email.trim(),
                phone: newLead.phone.trim(),
                country: newLead.country.trim().toUpperCase(),
              })
            }}
          >
            <div className="form-header">
              <div>
                <div className="form-title">Create New Lead</div>
                <div className="form-subtitle">Quick manual lead entry for QA and routing validation.</div>
              </div>
              <button
                type="button"
                className="btn-ghost"
                style={{ width: 32, height: 32, borderRadius: 16, padding: 0, justifyContent: 'center' }}
                onClick={() => setShowLeadModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {leadError && (
              <div className="form-alert form-alert-error" style={{ marginBottom: 14 }}>
                {leadError}
              </div>
            )}

            <div className="form-grid form-grid-2">
              <div className="form-field">
                <label className="form-label" htmlFor="lead-first-name">First Name</label>
                <input
                  id="lead-first-name"
                  className="form-control"
                  value={newLead.first_name}
                  onChange={(e) => setNewLead((prev) => ({ ...prev, first_name: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="lead-last-name">Last Name</label>
                <input
                  id="lead-last-name"
                  className="form-control"
                  value={newLead.last_name}
                  onChange={(e) => setNewLead((prev) => ({ ...prev, last_name: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="lead-email">Email</label>
                <input
                  id="lead-email"
                  type="email"
                  className="form-control"
                  value={newLead.email}
                  onChange={(e) => setNewLead((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="lead-phone">Phone (E.164 or local)</label>
                <input
                  id="lead-phone"
                  className="form-control"
                  value={newLead.phone}
                  onChange={(e) => setNewLead((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+14155552671"
                  required
                />
              </div>
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" htmlFor="lead-country">Country Code</label>
                <input
                  id="lead-country"
                  className="form-control"
                  value={newLead.country}
                  onChange={(e) => setNewLead((prev) => ({ ...prev, country: e.target.value }))}
                  placeholder="US"
                  maxLength={2}
                  required
                />
                <div className="form-help">Use ISO alpha-2 country code, e.g. US, GB, DE.</div>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" onClick={() => setShowLeadModal(false)} className="btn-ghost">Cancel</button>
              <button type="submit" className="btn-primary" disabled={createLeadMutation.isPending || !canSubmitLead}>
                {createLeadMutation.isPending ? 'Creating…' : 'Create Lead'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
