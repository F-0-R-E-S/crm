import { useState, useEffect } from 'react'
import { api } from '../lib/api'

interface StatusGroup {
  id: string
  name: string
  slug: string
  rank: number
  color: string
  is_terminal: boolean
  is_negative: boolean
  is_system: boolean
}

interface BrokerStatusMapping {
  id: string
  broker_id: string
  raw_status: string
  status_group_slug: string
}

export default function StatusGroupsPage() {
  const [groups, setGroups] = useState<StatusGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Add form
  const [formName, setFormName] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [formRank, setFormRank] = useState(0)
  const [formColor, setFormColor] = useState('#4facfe')
  const [formTerminal, setFormTerminal] = useState(false)
  const [formNegative, setFormNegative] = useState(false)
  const [formError, setFormError] = useState('')

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editRank, setEditRank] = useState(0)
  const [editColor, setEditColor] = useState('')

  // Broker mappings
  const [selectedBrokerId, setSelectedBrokerId] = useState('')
  const [mappings, setMappings] = useState<BrokerStatusMapping[]>([])
  const [mappingsLoading, setMappingsLoading] = useState(false)
  const [mapRawStatus, setMapRawStatus] = useState('')
  const [mapGroupSlug, setMapGroupSlug] = useState('')

  const fetchGroups = () => {
    setLoading(true)
    api
      .get<StatusGroup[]>('/status-groups')
      .then((res) => {
        setGroups(res)
        setError('')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load status groups'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchMappings = (brokerId: string) => {
    if (!brokerId) {
      setMappings([])
      return
    }
    setMappingsLoading(true)
    api
      .get<BrokerStatusMapping[]>(`/status-groups/mappings/${brokerId}`)
      .then((res) => setMappings(res))
      .catch(() => setMappings([]))
      .finally(() => setMappingsLoading(false))
  }

  useEffect(() => {
    fetchMappings(selectedBrokerId)
  }, [selectedBrokerId])

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
  }

  const handleNameChange = (val: string) => {
    setFormName(val)
    setFormSlug(generateSlug(val))
  }

  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    api
      .post<StatusGroup>('/status-groups', {
        name: formName.trim(),
        slug: formSlug.trim(),
        rank: formRank,
        color: formColor,
        is_terminal: formTerminal,
        is_negative: formNegative,
      })
      .then(() => {
        setFormName('')
        setFormSlug('')
        setFormRank(0)
        setFormColor('#4facfe')
        setFormTerminal(false)
        setFormNegative(false)
        fetchGroups()
      })
      .catch((err) => setFormError(err instanceof Error ? err.message : 'Failed to create group'))
  }

  const handleSaveEdit = (id: string) => {
    api
      .put(`/status-groups/${id}`, { name: editName, rank: editRank, color: editColor })
      .then(() => {
        setEditingId(null)
        fetchGroups()
      })
      .catch(() => {})
  }

  const handleDelete = (id: string) => {
    if (!confirm('Delete this status group?')) return
    api
      .delete(`/status-groups/${id}`)
      .then(() => fetchGroups())
      .catch(() => {})
  }

  const handleAddMapping = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBrokerId || !mapRawStatus.trim() || !mapGroupSlug) return
    api
      .post(`/status-groups/mappings/${selectedBrokerId}`, {
        raw_status: mapRawStatus.trim(),
        status_group_slug: mapGroupSlug,
      })
      .then(() => {
        setMapRawStatus('')
        setMapGroupSlug('')
        fetchMappings(selectedBrokerId)
      })
      .catch(() => {})
  }

  const handleDeleteMapping = (_id: string) => {
    api
      .delete(`/status-groups/mappings/${selectedBrokerId}`)
      .then(() => fetchMappings(selectedBrokerId))
      .catch(() => {})
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

  return (
    <div className="page-section">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Status Groups</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            Manage status groups and per-broker status mappings
          </p>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#f87171', marginBottom: 14 }}>
          {error}
        </div>
      )}

      {/* Status Groups Table */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {loading && (
          <div style={{ height: 2, background: 'var(--glass-bright)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #4facfe, #00f2fe)', animation: 'pulse 1.5s infinite' }} />
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={thStyle}>Color</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Slug</th>
              <th style={thStyle}>Rank</th>
              <th style={thStyle}>Terminal</th>
              <th style={thStyle}>Negative</th>
              <th style={thStyle}>System</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && groups.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '40px 12px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                  No status groups found
                </td>
              </tr>
            )}
            {groups.map((g) => (
              <tr key={g.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={tdStyle}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: g.color, border: '2px solid var(--glass-border)' }} />
                </td>
                <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--text-1)' }}>
                  {editingId === g.id ? (
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ ...inputStyle, width: 120 }} />
                  ) : (
                    g.name
                  )}
                </td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{g.slug}</td>
                <td style={tdStyle}>
                  {editingId === g.id ? (
                    <input type="number" value={editRank} onChange={(e) => setEditRank(Number(e.target.value))} style={{ ...inputStyle, width: 60 }} />
                  ) : (
                    g.rank
                  )}
                </td>
                <td style={tdStyle}>
                  {g.is_terminal ? (
                    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: 'rgba(52,211,153,0.14)', color: '#34d399' }}>Yes</span>
                  ) : (
                    <span style={{ color: 'var(--text-3)' }}>No</span>
                  )}
                </td>
                <td style={tdStyle}>
                  {g.is_negative ? (
                    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: 'rgba(248,113,113,0.14)', color: '#f87171' }}>Yes</span>
                  ) : (
                    <span style={{ color: 'var(--text-3)' }}>No</span>
                  )}
                </td>
                <td style={tdStyle}>
                  {g.is_system ? (
                    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: 'rgba(167,139,250,0.14)', color: '#a78bfa' }}>System</span>
                  ) : (
                    <span style={{ color: 'var(--text-3)' }}>Custom</span>
                  )}
                </td>
                <td style={tdStyle}>
                  {g.is_system ? (
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Read-only</span>
                  ) : editingId === g.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} style={{ width: 30, height: 28, border: 'none', background: 'none', cursor: 'pointer' }} />
                      <button onClick={() => handleSaveEdit(g.id)} style={{ ...btnStyle, padding: '5px 12px', fontSize: 11 }}>Save</button>
                      <button onClick={() => setEditingId(null)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--glass-light)', color: 'var(--text-2)', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => { setEditingId(g.id); setEditName(g.name); setEditRank(g.rank); setEditColor(g.color) }}
                        style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--glass-light)', color: 'var(--text-2)', fontSize: 11, cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(g.id)}
                        style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: 'rgba(248,113,113,0.14)', color: '#f87171', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Custom Group Form */}
      <div style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 16 }}>Add Custom Status Group</div>
        {formError && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#f87171', marginBottom: 14 }}>
            {formError}
          </div>
        )}
        <form onSubmit={handleAddGroup} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Name</label>
            <input value={formName} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Callback Scheduled" required style={{ ...inputStyle, width: 160 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Slug</label>
            <input value={formSlug} onChange={(e) => setFormSlug(e.target.value)} placeholder="auto-generated" required style={{ ...inputStyle, width: 140 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Rank</label>
            <input type="number" value={formRank} onChange={(e) => setFormRank(Number(e.target.value))} style={{ ...inputStyle, width: 70 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Color</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="color" value={formColor} onChange={(e) => setFormColor(e.target.value)} style={{ width: 32, height: 32, border: 'none', background: 'none', cursor: 'pointer' }} />
              <input value={formColor} onChange={(e) => setFormColor(e.target.value)} style={{ ...inputStyle, width: 80 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={formTerminal} onChange={(e) => setFormTerminal(e.target.checked)} /> Terminal
            </label>
            <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={formNegative} onChange={(e) => setFormNegative(e.target.checked)} /> Negative
            </label>
          </div>
          <button type="submit" style={btnStyle}>Add Group</button>
        </form>
      </div>

      {/* Per-Broker Mapping Section */}
      <div style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 16 }}>Per-Broker Status Mappings</div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Broker ID</label>
          <input
            value={selectedBrokerId}
            onChange={(e) => setSelectedBrokerId(e.target.value)}
            placeholder="Enter broker ID..."
            style={{ ...inputStyle, width: 280 }}
          />
        </div>

        {selectedBrokerId && (
          <>
            {/* Add mapping form */}
            <form onSubmit={handleAddMapping} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Raw Status</label>
                <input value={mapRawStatus} onChange={(e) => setMapRawStatus(e.target.value)} placeholder="e.g. CALL_BACK" required style={{ ...inputStyle, width: 180 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Status Group</label>
                <select
                  value={mapGroupSlug}
                  onChange={(e) => setMapGroupSlug(e.target.value)}
                  required
                  style={{ ...inputStyle, minWidth: 160 }}
                >
                  <option value="">Select group...</option>
                  {groups.map((g) => (
                    <option key={g.slug} value={g.slug}>{g.name} ({g.slug})</option>
                  ))}
                </select>
              </div>
              <button type="submit" style={btnStyle}>Add Mapping</button>
            </form>

            {/* Mappings table */}
            <div style={{ borderRadius: 12, border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
              {mappingsLoading && (
                <div style={{ height: 2, background: 'var(--glass-bright)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #4facfe, #00f2fe)', animation: 'pulse 1.5s infinite' }} />
                </div>
              )}
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Raw Status</th>
                    <th style={thStyle}>Status Group</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!mappingsLoading && mappings.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                        No mappings for this broker
                      </td>
                    </tr>
                  )}
                  {mappings.map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{m.raw_status}</td>
                      <td style={tdStyle}>{m.status_group_slug}</td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => handleDeleteMapping(m.id)}
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
          </>
        )}
      </div>
    </div>
  )
}
