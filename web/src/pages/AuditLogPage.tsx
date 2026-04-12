import { useState, useEffect } from 'react'
import { api } from '../lib/api'

interface AuditLogEntry {
  id: string
  timestamp: string
  user_id: string
  action: string
  resource_type: string
  resource_id: string
  ip: string
  duration_ms: number
  before_state: Record<string, unknown> | null
  after_state: Record<string, unknown> | null
}

interface AuditLogResponse {
  data: AuditLogEntry[]
  total: number
}

const PAGE_SIZE = 20

const ACTIONS = ['all', 'create', 'update', 'delete']
const RESOURCE_TYPES = ['all', 'lead', 'broker', 'affiliate', 'user', 'routing_rule', 'status_group', 'ip_whitelist', 'gdpr_request']

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filters
  const [userId, setUserId] = useState('')
  const [action, setAction] = useState('all')
  const [resourceType, setResourceType] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchData = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (userId) params.set('user_id', userId)
    if (action !== 'all') params.set('action', action)
    if (resourceType !== 'all') params.set('resource_type', resourceType)
    if (dateFrom) params.set('from', `${dateFrom}T00:00:00Z`)
    if (dateTo) params.set('to', `${dateTo}T23:59:59Z`)
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(page * PAGE_SIZE))

    api
      .get<AuditLogResponse>(`/compliance/audit-log?${params.toString()}`)
      .then((res) => {
        setEntries(res.data)
        setTotal(res.total)
      })
      .catch(() => {
        setEntries([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setPage(0)
  }, [userId, action, resourceType, dateFrom, dateTo])

  useEffect(() => {
    fetchData()
  }, [page, userId, action, resourceType, dateFrom, dateTo])

  const exportCSV = () => {
    if (entries.length === 0) return
    const headers = ['timestamp', 'user_id', 'action', 'resource_type', 'resource_id', 'ip', 'duration_ms']
    const rows = entries.map((e) => [
      e.timestamp,
      e.user_id,
      e.action,
      e.resource_type,
      e.resource_id,
      e.ip,
      String(e.duration_ms),
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

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

  const actionBadgeColor = (a: string) => {
    switch (a) {
      case 'create': return { bg: 'rgba(52,211,153,0.14)', color: '#34d399' }
      case 'update': return { bg: 'rgba(79,172,254,0.14)', color: '#4facfe' }
      case 'delete': return { bg: 'rgba(248,113,113,0.14)', color: '#f87171' }
      default: return { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-2)' }
    }
  }

  return (
    <div className="page-section">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Audit Log</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            {total > 0 ? `${total.toLocaleString()} entries` : 'System activity log'}
          </p>
        </div>
        <button
          onClick={exportCSV}
          style={{
            padding: '8px 16px',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            opacity: entries.length === 0 ? 0.5 : 1,
          }}
          disabled={entries.length === 0}
        >
          Export CSV
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ ...cardStyle, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>User ID</label>
          <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Filter by user..." style={{ ...inputStyle, width: 160 }} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Action</label>
          <select value={action} onChange={(e) => setAction(e.target.value)} style={inputStyle}>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{a === 'all' ? 'All Actions' : a}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Resource Type</label>
          <select value={resourceType} onChange={(e) => setResourceType(e.target.value)} style={inputStyle}>
            {RESOURCE_TYPES.map((rt) => (
              <option key={rt} value={rt}>{rt === 'all' ? 'All Types' : rt}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {loading && (
          <div style={{ height: 2, background: 'var(--glass-bright)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #4facfe, #00f2fe)', animation: 'pulse 1.5s infinite' }} />
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={thStyle}>Timestamp</th>
              <th style={thStyle}>User ID</th>
              <th style={thStyle}>Action</th>
              <th style={thStyle}>Resource Type</th>
              <th style={thStyle}>Resource ID</th>
              <th style={thStyle}>IP</th>
              <th style={thStyle}>Duration</th>
            </tr>
          </thead>
          <tbody>
            {!loading && entries.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '40px 12px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                  No audit log entries found
                </td>
              </tr>
            )}
            {entries.map((entry) => (
              <>
                <tr
                  key={entry.id}
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid var(--glass-border)' }}
                >
                  <td style={{ ...tdStyle, fontSize: 12 }}>{new Date(entry.timestamp).toLocaleString()}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{entry.user_id.slice(0, 8)}...</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      background: actionBadgeColor(entry.action).bg,
                      color: actionBadgeColor(entry.action).color,
                    }}>
                      {entry.action}
                    </span>
                  </td>
                  <td style={tdStyle}>{entry.resource_type}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{entry.resource_id.slice(0, 8)}...</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{entry.ip}</td>
                  <td style={tdStyle}>{entry.duration_ms}ms</td>
                </tr>
                {expandedId === entry.id && (
                  <tr key={`${entry.id}-detail`}>
                    <td colSpan={7} style={{ padding: '16px 24px', background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 8 }}>Before State</div>
                          <pre style={{
                            fontSize: 11,
                            color: 'var(--text-2)',
                            background: 'rgba(0,0,0,0.2)',
                            padding: 12,
                            borderRadius: 8,
                            overflow: 'auto',
                            maxHeight: 200,
                            margin: 0,
                            fontFamily: 'SF Mono, Menlo, Consolas, monospace',
                          }}>
                            {entry.before_state ? JSON.stringify(entry.before_state, null, 2) : 'null'}
                          </pre>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 8 }}>After State</div>
                          <pre style={{
                            fontSize: 11,
                            color: 'var(--text-2)',
                            background: 'rgba(0,0,0,0.2)',
                            padding: 12,
                            borderRadius: 8,
                            overflow: 'auto',
                            maxHeight: 200,
                            margin: 0,
                            fontFamily: 'SF Mono, Menlo, Consolas, monospace',
                          }}>
                            {entry.after_state ? JSON.stringify(entry.after_state, null, 2) : 'null'}
                          </pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderTop: '1px solid var(--glass-border)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--glass-border)',
                  background: 'var(--glass-light)',
                  color: 'var(--text-2)',
                  fontSize: 12,
                  cursor: page === 0 ? 'not-allowed' : 'pointer',
                  opacity: page === 0 ? 0.4 : 1,
                }}
              >
                Prev
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-2)', padding: '6px 0' }}>
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--glass-border)',
                  background: 'var(--glass-light)',
                  color: 'var(--text-2)',
                  fontSize: 12,
                  cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages - 1 ? 0.4 : 1,
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
