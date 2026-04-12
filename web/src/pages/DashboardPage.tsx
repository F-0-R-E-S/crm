import { useQuery } from '@tanstack/react-query'
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
    label: 'Delivered',
    desc: 'Latest batch',
    icon: '✓',
    color: '#34d399',
    glow: 'rgba(52,211,153,0.15)',
    delta: '+3.7%',
    up: true,
  },
  {
    key: 'fraud',
    label: 'Avg Fraud Score',
    desc: 'Latest batch',
    icon: '🛡',
    color: '#f87171',
    glow: 'rgba(248,113,113,0.15)',
    delta: '-0.3%',
    up: false,
  },
]

export default function DashboardPage() {
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-leads'],
    queryFn: () => api.get<LeadsResponse>('/leads?limit=6&offset=0'),
  })

  const total    = data?.total ?? 0
  const leads    = data?.leads ?? []
  const delivered = leads.filter((l) => l.status === 'delivered').length
  const newLeads  = leads.filter((l) => l.status === 'new').length
  const avgFraud  = leads.length > 0
    ? Math.round(leads.reduce((a, l) => a + (l.fraud_score ?? 0), 0) / leads.length)
    : 0

  const kpiValues: Record<string, string> = {
    total:     total.toString(),
    new:       newLeads.toString(),
    delivered: delivered.toString(),
    fraud:     avgFraud ? avgFraud.toString() : '--',
  }

  return (
    <div className="page-section">
      {/* Header */}
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
          <button className="btn-primary" style={{ fontSize: 12, padding: '7px 16px' }}>+ New Lead</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {KPI_CONFIGS.map((cfg) => (
          <div key={cfg.key} className="kpi-card">
            {/* Glow blob */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 'var(--r-xl)',
              background: `radial-gradient(circle at 85% 15%, ${cfg.glow}, transparent 65%)`,
              pointerEvents: 'none',
            }} />
            {/* Icon */}
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: cfg.glow,
              boxShadow: `0 0 16px ${cfg.glow}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, marginBottom: 14,
            }}>{cfg.icon}</div>
            {/* Value */}
            {isLoading ? (
              <div style={{ height: 36, width: 80, borderRadius: 8, background: 'var(--glass-bright)', marginBottom: 6, animation: 'pulse 1.5s infinite' }} />
            ) : (
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -1, color: 'var(--text-1)' }}>
                {kpiValues[cfg.key]}
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{cfg.label}</div>
            {/* Delta */}
            <div style={{
              position: 'absolute', top: 16, right: 16,
              fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
              background: cfg.up ? 'rgba(52,211,153,0.14)' : 'rgba(248,113,113,0.14)',
              color: cfg.up ? '#34d399' : '#f87171',
            }}>{cfg.delta}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent Leads */}
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
              {[1,2,3].map(i => (
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

        {/* Quick Stats */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div className="section-label">Platform Health</div>

          {[
            { label: 'Lead Delivery Rate', val: 89, color: '#34d399' },
            { label: 'Fraud Block Rate',   val: 11, color: '#f87171' },
            { label: 'Broker Uptime',      val: 97, color: '#4facfe' },
            { label: 'API Success Rate',   val: 99, color: '#a78bfa' },
          ].map(stat => (
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
              {['AlphaFX Pro','TradingHub','ForexDirect','BinaryWorld'].map(b => (
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
    </div>
  )
}
