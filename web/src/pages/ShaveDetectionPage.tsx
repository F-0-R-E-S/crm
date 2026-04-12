import { useState, useEffect } from 'react'
import { api } from '../lib/api'

interface ShaveEvent {
  id: string
  lead_id: string
  broker_id: string
  old_status: string
  new_status: string
  raw_status: string
  detected_at: string
  acknowledged: boolean
}

interface ShavesResponse {
  data: ShaveEvent[]
  total: number
}

type AckFilter = 'all' | 'pending' | 'acknowledged'

const PAGE_SIZE = 20

export default function ShaveDetectionPage() {
  const [events, setEvents] = useState<ShaveEvent[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [brokerId, setBrokerId] = useState('')
  const [ackFilter, setAckFilter] = useState<AckFilter>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchData = () => {
    setLoading(true)
    let url = `/fraud/shaves?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`
    if (brokerId) url += `&broker_id=${brokerId}`
    if (ackFilter !== 'all') url += `&acknowledged=${ackFilter === 'acknowledged'}`
    if (dateFrom) url += `&from=${dateFrom}T00:00:00Z`
    if (dateTo) url += `&to=${dateTo}T23:59:59Z`

    api
      .get<ShavesResponse>(url)
      .then((res) => {
        setEvents(res.data)
        setTotal(res.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setPage(0)
  }, [brokerId, ackFilter, dateFrom, dateTo])

  useEffect(() => {
    fetchData()
  }, [page, brokerId, ackFilter, dateFrom, dateTo])

  const handleAcknowledge = (id: string) => {
    api
      .post(`/fraud/shaves/${id}/acknowledge`, {})
      .then(() => fetchData())
      .catch(() => {})
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="page-section">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Shave Detection</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            Monitor and acknowledge suspected shave events
          </p>
        </div>
        {total > 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
            {total.toLocaleString()} event{total !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div
        style={{
          background: 'var(--glass-light)',
          backdropFilter: 'var(--blur-md)',
          WebkitBackdropFilter: 'var(--blur-md)',
          border: '1px solid var(--glass-border)',
          borderRadius: 20,
          padding: '16px 24px',
          marginBottom: 16,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-end',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 180 }}>
          <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Broker ID</label>
          <input
            value={brokerId}
            onChange={(e) => setBrokerId(e.target.value)}
            placeholder="Filter by broker..."
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-light)',
              color: 'var(--text-1)',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Status</label>
          <select
            value={ackFilter}
            onChange={(e) => setAckFilter(e.target.value as AckFilter)}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-light)',
              color: 'var(--text-1)',
              fontSize: 13,
              outline: 'none',
            }}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="acknowledged">Acknowledged</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-light)',
              color: 'var(--text-1)',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-light)',
              color: 'var(--text-1)',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: 'var(--glass-light)',
          backdropFilter: 'var(--blur-md)',
          WebkitBackdropFilter: 'var(--blur-md)',
          border: '1px solid var(--glass-border)',
          borderRadius: 20,
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {loading && (
          <div style={{ height: 2, background: 'var(--glass-bright)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #4facfe, #00f2fe)', animation: 'pulse 1.5s infinite' }} />
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Lead ID</th>
              <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Broker ID</th>
              <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Old Status</th>
              <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>New Status</th>
              <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Raw Status</th>
              <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Detected</th>
              <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && events.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '40px 12px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                  No shave events found
                </td>
              </tr>
            )}
            {events.map((ev) => (
              <tr key={ev.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-2)', fontFamily: 'monospace' }}>{ev.lead_id.slice(0, 8)}...</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-2)', fontFamily: 'monospace' }}>{ev.broker_id.slice(0, 8)}...</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-2)' }}>{ev.old_status}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: '#f87171', fontWeight: 500 }}>{ev.new_status}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-3)', fontFamily: 'monospace' }}>{ev.raw_status}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-2)' }}>{new Date(ev.detected_at).toLocaleString()}</td>
                <td style={{ padding: '10px 12px' }}>
                  {ev.acknowledged ? (
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: 'rgba(52,211,153,0.14)',
                        color: '#34d399',
                      }}
                    >
                      Acknowledged
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAcknowledge(ev.id)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 8,
                        border: 'none',
                        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Acknowledge
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderTop: '1px solid var(--glass-border)',
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
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
