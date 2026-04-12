import { useState, useEffect } from 'react'
import { api } from '../lib/api'

interface BlacklistEntry {
  id: string
  list_type: string
  value: string
  reason: string
  source: string
  expires_at: string | null
  created_at: string
}

interface BlacklistsResponse {
  data: BlacklistEntry[]
  total: number
}

type ListType = 'ip' | 'email' | 'phone' | 'domain'

const TABS: { type: ListType; label: string }[] = [
  { type: 'ip', label: 'IP' },
  { type: 'email', label: 'Email' },
  { type: 'phone', label: 'Phone' },
  { type: 'domain', label: 'Domain' },
]

const PAGE_SIZE = 20

export default function BlacklistsPage() {
  const [activeTab, setActiveTab] = useState<ListType>('ip')
  const [entries, setEntries] = useState<BlacklistEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)

  // Add form state
  const [newValue, setNewValue] = useState('')
  const [newReason, setNewReason] = useState('')
  const [newExpires, setNewExpires] = useState('')
  const [addError, setAddError] = useState('')

  // Bulk import modal
  const [showBulk, setShowBulk] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkError, setBulkError] = useState('')

  const fetchData = () => {
    setLoading(true)
    api
      .get<BlacklistsResponse>(`/fraud/blacklists?list_type=${activeTab}&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`)
      .then((res) => {
        setEntries(res.data)
        setTotal(res.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setPage(0)
  }, [activeTab])

  useEffect(() => {
    fetchData()
  }, [activeTab, page])

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    setAddError('')
    if (!newValue.trim()) {
      setAddError('Value is required')
      return
    }
    api
      .post('/fraud/blacklists', {
        list_type: activeTab,
        value: newValue.trim(),
        reason: newReason.trim(),
        expires_at: newExpires || null,
      })
      .then(() => {
        setNewValue('')
        setNewReason('')
        setNewExpires('')
        fetchData()
      })
      .catch((err) => setAddError(err instanceof Error ? err.message : 'Failed to add entry'))
  }

  const handleDelete = (id: string) => {
    api
      .delete(`/fraud/blacklists/${id}`)
      .then(() => fetchData())
      .catch(() => {})
  }

  const handleBulkImport = () => {
    setBulkError('')
    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
    if (lines.length === 0) {
      setBulkError('No entries provided')
      return
    }
    const entries = lines.map((line) => {
      const parts = line.split(',')
      return {
        list_type: activeTab,
        value: parts[0]?.trim() || '',
        reason: parts[1]?.trim() || '',
      }
    })
    api
      .post('/fraud/blacklists/bulk', { entries })
      .then(() => {
        setShowBulk(false)
        setBulkText('')
        fetchData()
      })
      .catch((err) => setBulkError(err instanceof Error ? err.message : 'Bulk import failed'))
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="page-section">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Blacklists</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            Manage blocked IPs, emails, phones, and domains
          </p>
        </div>
        <button
          onClick={() => setShowBulk(true)}
          style={{
            padding: '8px 16px',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Bulk Import
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {TABS.map((tab) => (
          <button
            key={tab.type}
            onClick={() => setActiveTab(tab.type)}
            style={{
              padding: '8px 18px',
              borderRadius: 10,
              border: 'none',
              background: activeTab === tab.type ? 'linear-gradient(135deg, #4facfe, #00f2fe)' : 'var(--glass-light)',
              color: activeTab === tab.type ? '#fff' : 'var(--text-2)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Add Entry Form */}
      <div
        style={{
          background: 'var(--glass-light)',
          backdropFilter: 'var(--blur-md)',
          WebkitBackdropFilter: 'var(--blur-md)',
          border: '1px solid var(--glass-border)',
          borderRadius: 20,
          padding: '24px',
          marginBottom: 16,
        }}
      >
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: 180 }}>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Value</label>
            <input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={activeTab === 'ip' ? '192.168.1.0/24' : activeTab === 'email' ? 'spam@example.com' : activeTab === 'phone' ? '+14155550000' : 'baddomain.com'}
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
          <div style={{ flex: 2, minWidth: 180 }}>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Reason</label>
            <input
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="Reason for blocking"
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
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Expires At</label>
            <input
              type="date"
              value={newExpires}
              onChange={(e) => setNewExpires(e.target.value)}
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
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Add
          </button>
        </form>
        {addError && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#f87171' }}>{addError}</div>
        )}
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
              <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Value</th>
              <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Reason</th>
              <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Source</th>
              <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Expires</th>
              <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Created</th>
              <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && entries.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '40px 12px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                  No {activeTab} entries in the blacklist
                </td>
              </tr>
            )}
            {entries.map((entry) => (
              <tr key={entry.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-1)', fontFamily: 'monospace', fontWeight: 500 }}>{entry.value}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-2)' }}>{entry.reason || '—'}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-2)' }}>{entry.source || '—'}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-2)' }}>{entry.expires_at ? new Date(entry.expires_at).toLocaleDateString() : 'Never'}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-2)' }}>{new Date(entry.created_at).toLocaleDateString()}</td>
                <td style={{ padding: '10px 12px' }}>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      border: '1px solid rgba(248,113,113,0.3)',
                      background: 'rgba(248,113,113,0.1)',
                      color: '#f87171',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
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

      {/* Bulk Import Modal */}
      {showBulk && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => e.target === e.currentTarget && setShowBulk(false)}
        >
          <div
            style={{
              background: 'var(--glass-light)',
              backdropFilter: 'var(--blur-md)',
              WebkitBackdropFilter: 'var(--blur-md)',
              border: '1px solid var(--glass-border)',
              borderRadius: 20,
              padding: '24px',
              width: '100%',
              maxWidth: 560,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)' }}>Bulk Import - {activeTab.toUpperCase()}</div>
              <button
                onClick={() => setShowBulk(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 18, cursor: 'pointer' }}
              >
                x
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
              One entry per line. Format: value,reason (reason is optional)
            </p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={10}
              placeholder={`192.168.1.1,Known spammer\n10.0.0.0/8,Internal range`}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 10,
                border: '1px solid var(--glass-border)',
                background: 'var(--glass-light)',
                color: 'var(--text-1)',
                fontSize: 13,
                fontFamily: 'monospace',
                outline: 'none',
                resize: 'vertical',
              }}
            />
            {bulkError && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#f87171' }}>{bulkError}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button
                onClick={() => setShowBulk(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 12,
                  border: '1px solid var(--glass-border)',
                  background: 'var(--glass-light)',
                  color: 'var(--text-2)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkImport}
                style={{
                  padding: '8px 16px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
