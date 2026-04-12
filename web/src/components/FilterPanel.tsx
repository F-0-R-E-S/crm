import { useState } from 'react'
import type { LeadFilters, FilterPreset } from '../types/leads'

interface Props {
  filters: LeadFilters
  onChange: (filters: LeadFilters) => void
  presets?: FilterPreset[]
  onSavePreset?: (name: string, isTeam: boolean) => void
  onLoadPreset?: (preset: FilterPreset) => void
  onDeletePreset?: (id: string) => void
}

const STATUS_OPTIONS = [
  { label: 'New', value: 'new' },
  { label: 'Processing', value: 'processing' },
  { label: 'Qualified', value: 'qualified' },
  { label: 'Routed', value: 'routed' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Deposited', value: 'deposited' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Fraud', value: 'fraud' },
  { label: 'Duplicate', value: 'duplicate' },
]

const COUNTRY_OPTIONS = [
  'US', 'DE', 'UA', 'PL', 'RO', 'TR', 'BR', 'GB', 'CA', 'AU',
  'NL', 'ES', 'IT', 'FR', 'SE', 'NO', 'AT', 'CH', 'CZ', 'FI',
]

export default function FilterPanel({ filters, onChange, presets, onSavePreset, onLoadPreset, onDeletePreset }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showSave, setShowSave] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [presetTeam, setPresetTeam] = useState(false)
  const [showPresets, setShowPresets] = useState(false)

  function update(patch: Partial<LeadFilters>) {
    onChange({ ...filters, ...patch })
  }

  function toggleStatus(status: string) {
    const current = filters.status ?? []
    update({ status: current.includes(status) ? current.filter(s => s !== status) : [...current, status] })
  }

  function toggleCountry(country: string) {
    const current = filters.country ?? []
    update({ country: current.includes(country) ? current.filter(c => c !== country) : [...current, country] })
  }

  const activeCount = Object.entries(filters).filter(([, v]) =>
    v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
  ).length

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: expanded ? 12 : 0 }}>
        <button
          className="btn-glass"
          style={{ fontSize: 12, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => setExpanded(!expanded)}
        >
          ⚙ Filters
          {activeCount > 0 && (
            <span style={{ background: 'var(--grad-blue)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>
              {activeCount}
            </span>
          )}
        </button>

        {/* Quick filters */}
        {!expanded && (
          <>
            {(filters.status ?? []).map(s => (
              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 8, background: 'rgba(79,172,254,0.12)', fontSize: 11, color: '#4facfe' }}>
                {s}
                <button onClick={() => toggleStatus(s)} style={{ background: 'none', border: 'none', color: '#4facfe', cursor: 'pointer', padding: 0, fontSize: 12 }}>✕</button>
              </span>
            ))}
            {(filters.country ?? []).map(c => (
              <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 8, background: 'rgba(52,211,153,0.12)', fontSize: 11, color: '#34d399' }}>
                {c}
                <button onClick={() => toggleCountry(c)} style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer', padding: 0, fontSize: 12 }}>✕</button>
              </span>
            ))}
          </>
        )}

        <div style={{ flex: 1 }} />

        {/* Presets */}
        <div style={{ position: 'relative' }}>
          <button className="btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => setShowPresets(!showPresets)}>
            My Filters ▾
          </button>
          {showPresets && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 20,
              background: 'rgba(13,21,38,0.98)', border: '1px solid var(--glass-border)',
              borderRadius: 10, padding: 6, minWidth: 200,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              {(presets ?? []).length === 0 && (
                <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-3)' }}>No saved presets</div>
              )}
              {(presets ?? []).map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6 }}>
                  <button
                    onClick={() => { onLoadPreset?.(p); setShowPresets(false) }}
                    style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-1)', fontSize: 12, textAlign: 'left', cursor: 'pointer', padding: 0 }}
                  >
                    {p.name} {p.is_team && <span style={{ fontSize: 9, color: 'var(--text-3)' }}>TEAM</span>}
                  </button>
                  <button onClick={() => onDeletePreset?.(p.id)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 12, padding: 0 }}>✕</button>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--glass-border)', marginTop: 4, paddingTop: 4 }}>
                <button onClick={() => { setShowSave(true); setShowPresets(false) }} style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'none', border: 'none', color: '#4facfe', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}>
                  + Save current filters
                </button>
              </div>
            </div>
          )}
        </div>

        {activeCount > 0 && (
          <button className="btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => onChange({})}>Clear All</button>
        )}
      </div>

      {expanded && (
        <div className="glass-card" style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {/* Status multi-select */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 6 }}>Status</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {STATUS_OPTIONS.map(s => (
                  <button key={s.value} onClick={() => toggleStatus(s.value)}
                    style={{
                      padding: '3px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                      border: 'none',
                      background: (filters.status ?? []).includes(s.value) ? 'rgba(79,172,254,0.2)' : 'rgba(255,255,255,0.04)',
                      color: (filters.status ?? []).includes(s.value) ? '#4facfe' : 'var(--text-2)',
                    }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Country */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 6 }}>Country</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {COUNTRY_OPTIONS.map(c => (
                  <button key={c} onClick={() => toggleCountry(c)}
                    style={{
                      padding: '3px 6px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
                      border: 'none',
                      background: (filters.country ?? []).includes(c) ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.04)',
                      color: (filters.country ?? []).includes(c) ? '#34d399' : 'var(--text-3)',
                    }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Fraud Score Range */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 6 }}>Fraud Score</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input className="glass-input" type="number" min={0} max={100} placeholder="Min" value={filters.fraud_score_min ?? ''} onChange={e => update({ fraud_score_min: e.target.value ? Number(e.target.value) : undefined })} style={{ width: 60, fontSize: 11, padding: '5px 8px' }} />
                <span style={{ color: 'var(--text-3)', fontSize: 11 }}>—</span>
                <input className="glass-input" type="number" min={0} max={100} placeholder="Max" value={filters.fraud_score_max ?? ''} onChange={e => update({ fraud_score_max: e.target.value ? Number(e.target.value) : undefined })} style={{ width: 60, fontSize: 11, padding: '5px 8px' }} />
              </div>
            </div>

            {/* Quality Score Range */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 6 }}>Quality Score</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input className="glass-input" type="number" min={0} max={100} placeholder="Min" value={filters.quality_score_min ?? ''} onChange={e => update({ quality_score_min: e.target.value ? Number(e.target.value) : undefined })} style={{ width: 60, fontSize: 11, padding: '5px 8px' }} />
                <span style={{ color: 'var(--text-3)', fontSize: 11 }}>—</span>
                <input className="glass-input" type="number" min={0} max={100} placeholder="Max" value={filters.quality_score_max ?? ''} onChange={e => update({ quality_score_max: e.target.value ? Number(e.target.value) : undefined })} style={{ width: 60, fontSize: 11, padding: '5px 8px' }} />
              </div>
            </div>

            {/* Date Created */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 6 }}>Created</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="glass-input" type="date" value={filters.date_from ?? ''} onChange={e => update({ date_from: e.target.value || undefined })} style={{ fontSize: 11, padding: '5px 8px' }} />
                <input className="glass-input" type="date" value={filters.date_to ?? ''} onChange={e => update({ date_to: e.target.value || undefined })} style={{ fontSize: 11, padding: '5px 8px' }} />
              </div>
            </div>

            {/* Affiliate / Broker / Offer / Funnel */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 6 }}>Affiliate</div>
              <input className="glass-input" placeholder="ID or name..." value={filters.affiliate_id ?? ''} onChange={e => update({ affiliate_id: e.target.value || undefined })} style={{ width: '100%', fontSize: 11, padding: '5px 8px' }} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 6 }}>Broker</div>
              <input className="glass-input" placeholder="ID or name..." value={filters.broker_id ?? ''} onChange={e => update({ broker_id: e.target.value || undefined })} style={{ width: '100%', fontSize: 11, padding: '5px 8px' }} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 6 }}>Source / UTM</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="glass-input" placeholder="source" value={filters.source ?? ''} onChange={e => update({ source: e.target.value || undefined })} style={{ flex: 1, fontSize: 11, padding: '5px 8px' }} />
                <input className="glass-input" placeholder="utm_source" value={filters.utm_source ?? ''} onChange={e => update({ utm_source: e.target.value || undefined })} style={{ flex: 1, fontSize: 11, padding: '5px 8px' }} />
              </div>
            </div>

            {/* Sale Status */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 6 }}>Sale Status</div>
              <select className="glass-input" value={filters.sale_status ?? ''} onChange={e => update({ sale_status: e.target.value || undefined })} style={{ width: '100%', fontSize: 11, padding: '5px 8px' }}>
                <option value="">All</option>
                <option value="ftd">FTD</option>
                <option value="no_deposit">No Deposit</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* IP */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 6 }}>IP Address</div>
              <input className="glass-input" placeholder="IP or CIDR..." value={filters.ip ?? ''} onChange={e => update({ ip: e.target.value || undefined })} style={{ width: '100%', fontSize: 11, padding: '5px 8px' }} />
            </div>

            {/* Has Comment */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 6 }}>Options</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-2)', cursor: 'pointer' }}>
                <input type="checkbox" checked={filters.has_comment ?? false} onChange={e => update({ has_comment: e.target.checked || undefined })} style={{ accentColor: '#4facfe' }} />
                Has comments
              </label>
            </div>

            {/* Tags */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 6 }}>Tags</div>
              <input className="glass-input" placeholder="tag1, tag2..." value={(filters.tags ?? []).join(', ')} onChange={e => update({ tags: e.target.value ? e.target.value.split(',').map(t => t.trim()) : undefined })} style={{ width: '100%', fontSize: 11, padding: '5px 8px' }} />
            </div>
          </div>
        </div>
      )}

      {showSave && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowSave(false)}>
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <div className="form-header">
              <div className="form-title">Save Filter Preset</div>
            </div>
            <div className="form-field">
              <label className="form-label">Name</label>
              <input className="glass-input" value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="My filter preset" autoFocus style={{ width: '100%', fontSize: 13 }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-2)', marginBottom: 16, cursor: 'pointer' }}>
              <input type="checkbox" checked={presetTeam} onChange={e => setPresetTeam(e.target.checked)} style={{ accentColor: '#4facfe' }} />
              Share with team
            </label>
            <div className="form-actions">
              <button className="btn-ghost" onClick={() => setShowSave(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => { onSavePreset?.(presetName, presetTeam); setShowSave(false); setPresetName('') }} disabled={!presetName.trim()}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
