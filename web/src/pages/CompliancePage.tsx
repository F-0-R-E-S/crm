import { useState, useEffect } from 'react'
import { api } from '../lib/api'

interface GdprRequest {
  id: string
  request_type: string
  subject_email: string
  status: string
  created_at: string
  notes?: string
}

interface GdprResponse {
  data: GdprRequest[]
  total: number
}

interface IpWhitelistEntry {
  id: string
  ip_range: string
  description: string
  is_active: boolean
  created_at: string
  expires_at: string | null
}

export default function CompliancePage() {
  // GDPR state
  const [gdprRequests, setGdprRequests] = useState<GdprRequest[]>([])
  const [gdprTotal, setGdprTotal] = useState(0)
  const [gdprLoading, setGdprLoading] = useState(true)
  const [gdprStatus, setGdprStatus] = useState('all')
  const [gdprPage, setGdprPage] = useState(0)
  const PAGE_SIZE = 10

  // Create GDPR request form
  const [gdprFormType, setGdprFormType] = useState<'erasure' | 'portability'>('erasure')
  const [gdprFormEmail, setGdprFormEmail] = useState('')
  const [gdprFormError, setGdprFormError] = useState('')

  // Update status
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [updateStatus, setUpdateStatus] = useState('')
  const [updateNotes, setUpdateNotes] = useState('')

  // IP Whitelist state
  const [ipEntries, setIpEntries] = useState<IpWhitelistEntry[]>([])
  const [ipLoading, setIpLoading] = useState(true)
  const [ipRange, setIpRange] = useState('')
  const [ipDescription, setIpDescription] = useState('')
  const [ipError, setIpError] = useState('')

  const fetchGdpr = () => {
    setGdprLoading(true)
    const params = new URLSearchParams()
    if (gdprStatus !== 'all') params.set('status', gdprStatus)
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(gdprPage * PAGE_SIZE))

    api
      .get<GdprResponse>(`/compliance/gdpr/requests?${params.toString()}`)
      .then((res) => {
        setGdprRequests(res.data)
        setGdprTotal(res.total)
      })
      .catch(() => {
        setGdprRequests([])
        setGdprTotal(0)
      })
      .finally(() => setGdprLoading(false))
  }

  const fetchIpWhitelist = () => {
    setIpLoading(true)
    api
      .get<IpWhitelistEntry[]>('/security/ip-whitelist')
      .then((res) => setIpEntries(res))
      .catch(() => setIpEntries([]))
      .finally(() => setIpLoading(false))
  }

  useEffect(() => {
    setGdprPage(0)
  }, [gdprStatus])

  useEffect(() => {
    fetchGdpr()
  }, [gdprPage, gdprStatus])

  useEffect(() => {
    fetchIpWhitelist()
  }, [])

  const handleCreateGdpr = (e: React.FormEvent) => {
    e.preventDefault()
    setGdprFormError('')
    const endpoint = gdprFormType === 'erasure' ? '/compliance/gdpr/erasure' : '/compliance/gdpr/export'
    api
      .post(endpoint, { subject_email: gdprFormEmail.trim() })
      .then(() => {
        setGdprFormEmail('')
        fetchGdpr()
      })
      .catch((err) => setGdprFormError(err instanceof Error ? err.message : 'Failed to create request'))
  }

  const handleUpdateGdprStatus = (id: string) => {
    api
      .put(`/compliance/gdpr/requests/${id}`, { status: updateStatus, notes: updateNotes })
      .then(() => {
        setUpdatingId(null)
        setUpdateStatus('')
        setUpdateNotes('')
        fetchGdpr()
      })
      .catch(() => {})
  }

  const handleAddIp = (e: React.FormEvent) => {
    e.preventDefault()
    setIpError('')
    api
      .post('/security/ip-whitelist', { ip_range: ipRange.trim(), description: ipDescription.trim() })
      .then(() => {
        setIpRange('')
        setIpDescription('')
        fetchIpWhitelist()
      })
      .catch((err) => setIpError(err instanceof Error ? err.message : 'Failed to add IP'))
  }

  const handleDeleteIp = (id: string) => {
    if (!confirm('Remove this IP from whitelist?')) return
    api
      .delete(`/security/ip-whitelist/${id}`)
      .then(() => fetchIpWhitelist())
      .catch(() => {})
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      pending: { bg: 'rgba(251,191,36,0.14)', color: '#fbbf24' },
      processing: { bg: 'rgba(79,172,254,0.14)', color: '#4facfe' },
      completed: { bg: 'rgba(52,211,153,0.14)', color: '#34d399' },
      rejected: { bg: 'rgba(248,113,113,0.14)', color: '#f87171' },
    }
    const style = map[status] || { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-2)' }
    return (
      <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: style.bg, color: style.color }}>
        {status}
      </span>
    )
  }

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

  const btnStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
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

  const gdprTotalPages = Math.max(1, Math.ceil(gdprTotal / PAGE_SIZE))

  return (
    <div className="page-section">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Compliance</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            GDPR data requests and security controls
          </p>
        </div>
      </div>

      {/* ===== GDPR Section ===== */}
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginBottom: 12, marginTop: 8 }}>GDPR Requests</div>

      {/* Create GDPR request form */}
      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 12 }}>New GDPR Request</div>
        {gdprFormError && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#f87171', marginBottom: 12 }}>
            {gdprFormError}
          </div>
        )}
        <form onSubmit={handleCreateGdpr} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Type</label>
            <select value={gdprFormType} onChange={(e) => setGdprFormType(e.target.value as 'erasure' | 'portability')} style={inputStyle}>
              <option value="erasure">Erasure</option>
              <option value="portability">Portability</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Subject Email</label>
            <input type="email" value={gdprFormEmail} onChange={(e) => setGdprFormEmail(e.target.value)} placeholder="user@example.com" required style={{ ...inputStyle, width: 240 }} />
          </div>
          <button type="submit" style={btnStyle}>Create Request</button>
        </form>
      </div>

      {/* GDPR filter + table */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'pending', 'processing', 'completed', 'rejected'].map((s) => (
            <button
              key={s}
              onClick={() => setGdprStatus(s)}
              style={{
                padding: '6px 14px',
                borderRadius: 10,
                border: gdprStatus === s ? 'none' : '1px solid var(--glass-border)',
                background: gdprStatus === s ? 'linear-gradient(135deg, #4facfe, #00f2fe)' : 'var(--glass-light)',
                color: gdprStatus === s ? '#fff' : 'var(--text-2)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {gdprLoading && (
          <div style={{ height: 2, background: 'var(--glass-bright)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #4facfe, #00f2fe)', animation: 'pulse 1.5s infinite' }} />
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Subject Email</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Created At</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!gdprLoading && gdprRequests.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '30px 12px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                  No GDPR requests found
                </td>
              </tr>
            )}
            {gdprRequests.map((req) => (
              <tr key={req.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{req.id.slice(0, 8)}...</td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    background: req.request_type === 'erasure' ? 'rgba(248,113,113,0.14)' : 'rgba(167,139,250,0.14)',
                    color: req.request_type === 'erasure' ? '#f87171' : '#a78bfa',
                  }}>
                    {req.request_type}
                  </span>
                </td>
                <td style={tdStyle}>{req.subject_email}</td>
                <td style={tdStyle}>{statusBadge(req.status)}</td>
                <td style={{ ...tdStyle, fontSize: 12 }}>{new Date(req.created_at).toLocaleString()}</td>
                <td style={tdStyle}>
                  {updatingId === req.id ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <select value={updateStatus} onChange={(e) => setUpdateStatus(e.target.value)} style={{ ...inputStyle, fontSize: 11, padding: '4px 8px' }}>
                        <option value="">Status...</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      <input value={updateNotes} onChange={(e) => setUpdateNotes(e.target.value)} placeholder="Notes" style={{ ...inputStyle, fontSize: 11, padding: '4px 8px', width: 100 }} />
                      <button onClick={() => handleUpdateGdprStatus(req.id)} disabled={!updateStatus} style={{ ...btnStyle, padding: '4px 10px', fontSize: 11, opacity: updateStatus ? 1 : 0.5 }}>Save</button>
                      <button onClick={() => setUpdatingId(null)} style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--glass-light)', color: 'var(--text-2)', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setUpdatingId(req.id); setUpdateStatus(req.status); setUpdateNotes('') }}
                      style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--glass-light)', color: 'var(--text-2)', fontSize: 11, cursor: 'pointer' }}
                    >
                      Update Status
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {gdprTotalPages > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderTop: '1px solid var(--glass-border)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Showing {gdprPage * PAGE_SIZE + 1}-{Math.min((gdprPage + 1) * PAGE_SIZE, gdprTotal)} of {gdprTotal}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setGdprPage((p) => Math.max(0, p - 1))}
                disabled={gdprPage === 0}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--glass-light)', color: 'var(--text-2)', fontSize: 12, cursor: gdprPage === 0 ? 'not-allowed' : 'pointer', opacity: gdprPage === 0 ? 0.4 : 1 }}
              >
                Prev
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-2)', padding: '6px 0' }}>{gdprPage + 1} / {gdprTotalPages}</span>
              <button
                onClick={() => setGdprPage((p) => Math.min(gdprTotalPages - 1, p + 1))}
                disabled={gdprPage >= gdprTotalPages - 1}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--glass-light)', color: 'var(--text-2)', fontSize: 12, cursor: gdprPage >= gdprTotalPages - 1 ? 'not-allowed' : 'pointer', opacity: gdprPage >= gdprTotalPages - 1 ? 0.4 : 1 }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== Security Section ===== */}
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginBottom: 12, marginTop: 32 }}>Security</div>

      {/* Add IP form */}
      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 12 }}>Add IP to Whitelist</div>
        {ipError && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#f87171', marginBottom: 12 }}>
            {ipError}
          </div>
        )}
        <form onSubmit={handleAddIp} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>IP / CIDR Range</label>
            <input value={ipRange} onChange={(e) => setIpRange(e.target.value)} placeholder="192.168.1.0/24" required style={{ ...inputStyle, width: 180 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Description</label>
            <input value={ipDescription} onChange={(e) => setIpDescription(e.target.value)} placeholder="Office network" required style={{ ...inputStyle, width: 200 }} />
          </div>
          <button type="submit" style={btnStyle}>Add IP</button>
        </form>
      </div>

      {/* IP Whitelist table */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {ipLoading && (
          <div style={{ height: 2, background: 'var(--glass-bright)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #4facfe, #00f2fe)', animation: 'pulse 1.5s infinite' }} />
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={thStyle}>IP Range</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Active</th>
              <th style={thStyle}>Created</th>
              <th style={thStyle}>Expires</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!ipLoading && ipEntries.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '30px 12px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                  No IP whitelist entries
                </td>
              </tr>
            )}
            {ipEntries.map((entry) => (
              <tr key={entry.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 500 }}>{entry.ip_range}</td>
                <td style={tdStyle}>{entry.description}</td>
                <td style={tdStyle}>
                  {entry.is_active ? (
                    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: 'rgba(52,211,153,0.14)', color: '#34d399' }}>Active</span>
                  ) : (
                    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: 'rgba(248,113,113,0.14)', color: '#f87171' }}>Inactive</span>
                  )}
                </td>
                <td style={{ ...tdStyle, fontSize: 12 }}>{new Date(entry.created_at).toLocaleDateString()}</td>
                <td style={{ ...tdStyle, fontSize: 12 }}>{entry.expires_at ? new Date(entry.expires_at).toLocaleDateString() : 'Never'}</td>
                <td style={tdStyle}>
                  <button
                    onClick={() => handleDeleteIp(entry.id)}
                    style={{ padding: '4px 10px', borderRadius: 8, border: 'none', background: 'rgba(248,113,113,0.14)', color: '#f87171', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Active Sessions link */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>Active Sessions</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Manage active user sessions and revoke access</div>
          </div>
          <a
            href="/settings/sessions"
            style={{
              padding: '8px 16px',
              borderRadius: 12,
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-light)',
              color: 'var(--text-1)',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            View Sessions
          </a>
        </div>
      </div>
    </div>
  )
}
