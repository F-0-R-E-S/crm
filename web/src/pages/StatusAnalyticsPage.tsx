import { useState, useEffect } from 'react'
import { api } from '../lib/api'

interface StatusDistEntry {
  broker_id: string
  broker_name: string
  status_group_slug: string
  status_group_name: string
  color: string
  count: number
  percentage: number
}

interface StaleLead {
  lead_id: string
  broker_id: string
  status: string
  hours_stale: number
  updated_at: string
}

interface StatusAnomaly {
  id: string
  type: string
  severity: string
  broker_id: string
  details: string
  detected_at: string
  resolved: boolean
}

interface AnomaliesResponse {
  data: StatusAnomaly[]
  total: number
}

export default function StatusAnalyticsPage() {
  const [distribution, setDistribution] = useState<StatusDistEntry[]>([])
  const [staleLeads, setStaleLeads] = useState<StaleLead[]>([])
  const [anomalies, setAnomalies] = useState<StatusAnomaly[]>([])
  const [loading, setLoading] = useState(true)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [brokerId, setBrokerId] = useState('')
  const [thresholdHours, setThresholdHours] = useState(48)

  const fetchData = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (dateFrom) params.set('from', `${dateFrom}T00:00:00Z`)
    if (dateTo) params.set('to', `${dateTo}T23:59:59Z`)
    if (brokerId) params.set('broker_id', brokerId)

    const distUrl = `/status-analytics/distribution${params.toString() ? '?' + params.toString() : ''}`
    const staleUrl = `/status-analytics/stale-leads?threshold_hours=${thresholdHours}`
    const anomalyUrl = `/shave-detection/anomalies?limit=20`

    Promise.all([
      api.get<StatusDistEntry[]>(distUrl).catch(() => [] as StatusDistEntry[]),
      api.get<StaleLead[]>(staleUrl).catch(() => [] as StaleLead[]),
      api.get<AnomaliesResponse>(anomalyUrl).catch(() => ({ data: [], total: 0 } as AnomaliesResponse)),
    ]).then(([dist, stale, anom]) => {
      setDistribution(dist)
      setStaleLeads(stale)
      setAnomalies(anom.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
  }, [dateFrom, dateTo, brokerId, thresholdHours])

  const handleResolve = (id: string) => {
    api
      .post(`/shave-detection/anomalies/${id}/resolve`, {})
      .then(() => fetchData())
      .catch(() => {})
  }

  // Group distribution by broker
  const brokerDist = distribution.reduce<Record<string, StatusDistEntry[]>>((acc, entry) => {
    if (!acc[entry.broker_id]) acc[entry.broker_id] = []
    acc[entry.broker_id].push(entry)
    return acc
  }, {})

  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-3)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    textAlign: 'left',
    borderBottom: '1px solid var(--glass-border)',
  }

  const tdStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: 13,
    color: 'var(--text-2)',
  }

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid var(--glass-border)',
    background: 'var(--glass-light)',
    color: 'var(--text-1)',
    fontSize: 13,
    outline: 'none',
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--glass-light)',
    backdropFilter: 'var(--blur-md)',
    WebkitBackdropFilter: 'var(--blur-md)',
    border: '1px solid var(--glass-border)',
    borderRadius: 20,
    padding: '24px',
    marginBottom: 16,
  }

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#f87171'
      case 'high': return '#fb923c'
      case 'medium': return '#fbbf24'
      default: return 'var(--text-3)'
    }
  }

  return (
    <div className="page-section">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Status Analytics</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            Cross-broker status distribution, stale leads, and anomaly detection
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ ...cardStyle, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Broker ID</label>
          <input value={brokerId} onChange={(e) => setBrokerId(e.target.value)} placeholder="All brokers" style={{ ...inputStyle, width: 180 }} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Stale Threshold (hrs)</label>
          <input type="number" value={thresholdHours} onChange={(e) => setThresholdHours(Number(e.target.value) || 48)} style={{ ...inputStyle, width: 80 }} />
        </div>
      </div>

      {loading && (
        <div style={{ height: 2, background: 'var(--glass-bright)', overflow: 'hidden', borderRadius: 1, marginBottom: 16 }}>
          <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #4facfe, #00f2fe)', animation: 'pulse 1.5s infinite' }} />
        </div>
      )}

      {/* Status Distribution Chart */}
      <div style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 16 }}>Status Distribution by Broker</div>
        {Object.keys(brokerDist).length === 0 && !loading && (
          <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
            No distribution data available
          </div>
        )}
        {Object.entries(brokerDist).map(([bid, entries]) => {
          const brokerName = entries[0]?.broker_name || bid.slice(0, 8)
          const totalCount = entries.reduce((sum, e) => sum + e.count, 0)
          return (
            <div key={bid} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{brokerName}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{totalCount.toLocaleString()} leads</span>
              </div>
              <div style={{ display: 'flex', height: 24, borderRadius: 6, overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
                {entries.map((entry, i) => (
                  <div
                    key={i}
                    title={`${entry.status_group_name}: ${entry.percentage.toFixed(1)}%`}
                    style={{
                      width: `${entry.percentage}%`,
                      background: entry.color || '#4facfe',
                      minWidth: entry.percentage > 0 ? 2 : 0,
                      transition: 'width 0.3s ease',
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                {entries.map((entry, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-3)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color || '#4facfe', display: 'inline-block' }} />
                    {entry.status_group_name} ({entry.percentage.toFixed(1)}%)
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Stale Leads */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 12px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
            Stale Leads
            {staleLeads.length > 0 && (
              <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(251,191,36,0.14)', color: '#fbbf24' }}>
                {staleLeads.length}
              </span>
            )}
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={thStyle}>Lead ID</th>
              <th style={thStyle}>Broker ID</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Hours Stale</th>
              <th style={thStyle}>Updated At</th>
            </tr>
          </thead>
          <tbody>
            {staleLeads.length === 0 && !loading && (
              <tr>
                <td colSpan={5} style={{ padding: '30px 12px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                  No stale leads detected
                </td>
              </tr>
            )}
            {staleLeads.map((lead) => (
              <tr key={lead.lead_id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{lead.lead_id.slice(0, 8)}...</td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{lead.broker_id.slice(0, 8)}...</td>
                <td style={tdStyle}>{lead.status}</td>
                <td style={{ ...tdStyle, fontWeight: 600, color: lead.hours_stale > 96 ? '#f87171' : '#fbbf24' }}>
                  {lead.hours_stale}h
                </td>
                <td style={tdStyle}>{new Date(lead.updated_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Anomaly Alerts */}
      <div style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 16 }}>
          Anomaly Alerts
          {anomalies.filter((a) => !a.resolved).length > 0 && (
            <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(248,113,113,0.14)', color: '#f87171' }}>
              {anomalies.filter((a) => !a.resolved).length} unresolved
            </span>
          )}
        </div>
        {anomalies.length === 0 && !loading && (
          <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
            No anomalies detected
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {anomalies.map((a) => (
            <div
              key={a.id}
              style={{
                padding: '14px 18px',
                borderRadius: 12,
                border: `1px solid ${a.resolved ? 'var(--glass-border)' : severityColor(a.severity) + '33'}`,
                background: a.resolved ? 'transparent' : severityColor(a.severity) + '08',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: severityColor(a.severity) + '1a', color: severityColor(a.severity), textTransform: 'uppercase' }}>
                    {a.severity}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>{a.type}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>{a.broker_id.slice(0, 8)}...</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{a.details}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{new Date(a.detected_at).toLocaleString()}</div>
              </div>
              {a.resolved ? (
                <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: 'rgba(52,211,153,0.14)', color: '#34d399' }}>
                  Resolved
                </span>
              ) : (
                <button
                  onClick={() => handleResolve(a.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Resolve
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
