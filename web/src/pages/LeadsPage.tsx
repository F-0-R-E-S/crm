import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { api } from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import LeadDetail from '../components/LeadDetail'

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  country: string
  status: string
  fraud_score?: number
  affiliate_id?: string
  created_at: string
}

interface LeadsResponse {
  leads: Lead[]
  total: number
  limit: number
  offset: number
}

const PAGE_SIZE = 20

function fraudColor(score: number) {
  return score >= 70 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171'
}

export default function LeadsPage() {
  const [page, setPage] = useState(0)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['leads', page],
    queryFn: () => api.get<LeadsResponse>(`/leads?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`),
    placeholderData: (prev) => prev,
  })

  const leads      = data?.leads ?? []
  const total      = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="page-section">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Leads</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            {total > 0 ? `${total.toLocaleString()} total` : 'No leads yet'}
          </p>
        </div>
        <button className="btn-glass" style={{ fontSize: 12, padding: '7px 14px' }}>⬇ Export CSV</button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: 14, pointerEvents: 'none' }}>⌕</span>
          <input className="glass-input" style={{ paddingLeft: 34 }} placeholder="Search leads…" />
        </div>
        <button className="btn-ghost">Status ▾</button>
        <button className="btn-ghost">Country ▾</button>
        <button className="btn-ghost">Date ▾</button>
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#f87171', marginBottom: 14 }}>
          {error instanceof Error ? error.message : 'Failed to load leads'}
        </div>
      )}

      {/* Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Loading bar */}
        {isFetching && (
          <div style={{ height: 2, background: 'var(--glass-bright)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #4facfe, #00f2fe)', animation: 'pulse 1.5s infinite' }} />
          </div>
        )}

        <table className="glass-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Country</th>
              <th>Status</th>
              <th>Fraud Score</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <td key={j}><div style={{ height: 14, borderRadius: 7, background: 'var(--glass-bright)', width: j === 0 ? 80 : j === 1 ? 120 : 100 }} /></td>
                ))}
              </tr>
            ))}

            {!isLoading && leads.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: 14 }}>
                  No leads yet. Send your first lead via the API.
                </td>
              </tr>
            )}

            {leads.map((lead) => (
              <tr key={lead.id} onClick={() => setSelectedLeadId(lead.id)}>
                <td className="td-mono" style={{ color: 'var(--text-3)' }}>{lead.id.slice(0, 8)}…</td>
                <td className="td-primary">{lead.first_name} {lead.last_name}</td>
                <td>{lead.email}</td>
                <td>{lead.country}</td>
                <td><StatusBadge status={lead.status} /></td>
                <td>
                  {lead.fraud_score != null ? (
                    <span style={{ fontWeight: 600, color: fraudColor(lead.fraud_score) }}>
                      {lead.fraud_score}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-3)' }}>—</span>
                  )}
                </td>
                <td>{format(new Date(lead.created_at), 'MMM d, HH:mm')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderTop: '1px solid var(--glass-border)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-ghost"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                style={{ opacity: page === 0 ? 0.4 : 1 }}
              >← Prev</button>
              <span style={{ fontSize: 12, color: 'var(--text-2)', padding: '7px 0' }}>
                {page + 1} / {totalPages}
              </span>
              <button
                className="btn-ghost"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                style={{ opacity: page >= totalPages - 1 ? 0.4 : 1 }}
              >Next →</button>
            </div>
          </div>
        )}
      </div>

      {selectedLeadId && (
        <LeadDetail leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
      )}
    </div>
  )
}
