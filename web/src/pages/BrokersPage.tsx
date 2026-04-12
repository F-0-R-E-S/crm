import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

interface Broker {
  id: string
  name: string
  status: string
  endpoint: string
  daily_cap: number
  total_cap: number
  priority: number
  health_status: string
  circuit_state: string
  opening_hours_enabled: boolean
  maintenance_mode: boolean
  test_mode: boolean
  created_at: string
}

interface BrokersResponse {
  brokers: Broker[]
  total: number
  page: number
  per_page: number
}

interface CapUsage {
  daily_cap: number
  delivered_today: number
  remaining: number
}

const INITIAL_FORM = { name: '', endpoint: '', key: '', daily_cap: 500, total_cap: 0, priority: 0 }

export default function BrokersPage() {
  const [brokers, setBrokers] = useState<Broker[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [capUsage, setCapUsage] = useState<Record<string, CapUsage>>({})
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(true)

  const fetchBrokers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '20' })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const data = await api.get<BrokersResponse>(`/brokers?${params}`)
      setBrokers(data.brokers || [])
      setTotal(data.total || 0)
    } catch { setBrokers([]) }
    setLoading(false)
  }, [page, search, statusFilter])

  useEffect(() => { fetchBrokers() }, [fetchBrokers])

  useEffect(() => {
    brokers.forEach(async (b) => {
      try {
        const usage = await api.get<CapUsage>(`/brokers/${b.id}/cap-usage`)
        setCapUsage(prev => ({ ...prev, [b.id]: usage }))
      } catch { /* ignore */ }
    })
  }, [brokers])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/brokers', {
        name: form.name.trim(),
        endpoint: form.endpoint.trim(),
        credentials: { api_key: form.key },
        daily_cap: form.daily_cap,
        total_cap: form.total_cap,
        priority: form.priority,
      })
      setForm(INITIAL_FORM)
      setShowModal(false)
      fetchBrokers()
    } catch { /* TODO: show error */ }
  }

  const handleClone = async (id: string, name: string) => {
    try {
      await api.post(`/brokers/${id}/clone`, { name: `${name} (Copy)` })
      fetchBrokers()
    } catch { /* ignore */ }
  }

  const handleToggleStatus = async (id: string, current: string) => {
    const next = current === 'active' ? 'paused' : 'active'
    try {
      await api.patch(`/brokers/${id}`, { status: next })
      fetchBrokers()
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this broker?')) return
    try {
      await api.delete(`/brokers/${id}`)
      fetchBrokers()
    } catch { /* ignore */ }
  }

  const connected = brokers.filter(b => b.status === 'active').length

  return (
    <div className="page-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Brokers</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            {connected} active · {total} total
          </p>
        </div>
        <button className="btn-primary" style={{ fontSize: 12, padding: '8px 18px' }} onClick={() => setShowModal(true)}>
          + Add Broker
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <input
            className="glass-input"
            style={{ paddingLeft: 12 }}
            placeholder="Search brokers..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select className="btn-ghost" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          style={{ background: 'var(--glass-light)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '6px 12px', color: 'var(--text-2)', fontSize: 12 }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="glass-table">
          <thead>
            <tr>
              <th>Broker</th><th>Health</th><th>Circuit</th>
              <th>Cap Usage</th><th>Priority</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>Loading...</td></tr>}
            {!loading && brokers.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No brokers found</td></tr>
            )}
            {brokers.map(b => {
              const cu = capUsage[b.id]
              const capPercent = cu?.daily_cap ? Math.round((cu.delivered_today / cu.daily_cap) * 100) : 0
              return (
                <tr key={b.id}>
                  <td className="td-primary" style={{ fontWeight: 600 }}>
                    {b.name}
                    {b.maintenance_mode && <span style={{ marginLeft: 6, fontSize: 10, color: '#fbbf24' }}>MAINT</span>}
                    {b.test_mode && <span style={{ marginLeft: 6, fontSize: 10, color: '#a78bfa' }}>TEST</span>}
                  </td>
                  <td>
                    <span className={`status-badge ${b.health_status}`}>{b.health_status}</span>
                  </td>
                  <td>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 999,
                      background: b.circuit_state === 'open' ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.06)',
                      color: b.circuit_state === 'open' ? '#f87171' : b.circuit_state === 'half_open' ? '#fbbf24' : 'var(--text-2)',
                    }}>
                      {b.circuit_state}
                    </span>
                  </td>
                  <td>
                    {cu ? (
                      <div style={{ minWidth: 100 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                          <span style={{ color: 'var(--text-3)' }}>{cu.delivered_today}/{cu.daily_cap}</span>
                          <span style={{ color: 'var(--text-2)' }}>{capPercent}%</span>
                        </div>
                        <div className="score-track">
                          <div className="score-fill" style={{
                            width: `${capPercent}%`,
                            background: capPercent > 90 ? 'var(--grad-rose)' : capPercent > 70 ? 'linear-gradient(135deg,#fbbf24,#f59e0b)' : 'var(--grad-blue)',
                          }} />
                        </div>
                      </div>
                    ) : <span style={{ color: 'var(--text-3)', fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ fontWeight: 500 }}>{b.priority}</td>
                  <td><span className={`status-badge ${b.status}`}>{b.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-ghost" onClick={() => handleToggleStatus(b.id, b.status)}>
                        {b.status === 'active' ? 'Pause' : 'Activate'}
                      </button>
                      <button className="btn-ghost" onClick={() => handleClone(b.id, b.name)}>Clone</button>
                      <button className="btn-ghost" style={{ color: 'var(--rose)' }} onClick={() => handleDelete(b.id)}>Del</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {total > 20 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
          <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
          <span style={{ color: 'var(--text-2)', fontSize: 13, alignSelf: 'center' }}>Page {page} of {Math.ceil(total / 20)}</span>
          <button className="btn-ghost" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <form className="modal-box" style={{ maxWidth: 760 }} onSubmit={handleCreate}>
            <div className="form-header">
              <div>
                <div className="form-title">Add Broker Integration</div>
                <div className="form-subtitle">Connect a new broker to routing and validate credentials.</div>
              </div>
              <button type="button" className="btn-ghost" style={{ width: 32, height: 32, borderRadius: 16, padding: 0, justifyContent: 'center' }} onClick={() => setShowModal(false)}>x</button>
            </div>
            <div className="form-grid form-grid-2">
              <div className="form-field">
                <label className="form-label">Broker Name</label>
                <input className="form-control" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Binolla Markets" required autoFocus />
              </div>
              <div className="form-field">
                <label className="form-label">Priority</label>
                <input type="number" className="form-control" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: Number(e.target.value) }))} />
              </div>
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">API Endpoint</label>
                <input className="form-control" value={form.endpoint} onChange={e => setForm(p => ({ ...p, endpoint: e.target.value }))} placeholder="https://broker.example.com/api/v2/leads" required />
              </div>
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">API Key</label>
                <input className="form-control" value={form.key} onChange={e => setForm(p => ({ ...p, key: e.target.value }))} placeholder="sk_live_xxx" required />
              </div>
              <div className="form-field">
                <label className="form-label">Daily Cap</label>
                <input type="number" min={0} className="form-control" value={form.daily_cap} onChange={e => setForm(p => ({ ...p, daily_cap: Number(e.target.value) }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Total Cap</label>
                <input type="number" min={0} className="form-control" value={form.total_cap} onChange={e => setForm(p => ({ ...p, total_cap: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={!form.name.trim() || !form.endpoint.trim() || !form.key.trim()}>Add Broker</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
