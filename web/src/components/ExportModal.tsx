import { useState } from 'react'
import { ALL_COLUMNS, COLUMN_GROUPS, DEFAULT_COLUMNS, type LeadFilters } from '../types/leads'

interface Props {
  filters: LeadFilters
  totalLeads: number
  onExport: (columns: string[], format: 'csv' | 'xlsx') => void
  onClose: () => void
}

export default function ExportModal({ filters, totalLeads, onExport, onClose }: Props) {
  const [selected, setSelected] = useState<string[]>(DEFAULT_COLUMNS)
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv')

  const grouped = Object.keys(COLUMN_GROUPS).map(g => ({
    key: g,
    label: COLUMN_GROUPS[g],
    columns: ALL_COLUMNS.filter(c => c.group === g),
  }))

  function toggle(key: string) {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)).length

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 600 }}>
        <div className="form-header">
          <div>
            <div className="form-title">Export Leads</div>
            <div className="form-subtitle">
              {totalLeads.toLocaleString()} leads{activeFilterCount > 0 ? ` (${activeFilterCount} filters active)` : ''}
            </div>
          </div>
          <button type="button" className="btn-ghost" style={{ width: 32, height: 32, borderRadius: 16, padding: 0, justifyContent: 'center' }} onClick={onClose}>✕</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 8 }}>Format</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['csv', 'xlsx'] as const).map(f => (
              <button key={f} className={format === f ? 'btn-primary' : 'btn-glass'} style={{ fontSize: 12, padding: '7px 16px' }} onClick={() => setFormat(f)}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>
              Columns ({selected.length})
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setSelected(ALL_COLUMNS.map(c => c.key))}>All</button>
              <button className="btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setSelected(DEFAULT_COLUMNS)}>Default</button>
              <button className="btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setSelected([])}>None</button>
            </div>
          </div>
          <div style={{ maxHeight: 280, overflow: 'auto', paddingRight: 8 }}>
            {grouped.map(g => (
              <div key={g.key} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{g.label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {g.columns.map(c => (
                    <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer', background: selected.includes(c.key) ? 'rgba(79,172,254,0.1)' : 'rgba(255,255,255,0.03)', color: selected.includes(c.key) ? 'var(--text-1)' : 'var(--text-3)' }}>
                      <input type="checkbox" checked={selected.includes(c.key)} onChange={() => toggle(c.key)} style={{ accentColor: '#4facfe', width: 12, height: 12 }} />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {totalLeads > 5000 && (
          <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#fbbf24', marginBottom: 14 }}>
            Large export ({totalLeads.toLocaleString()} rows) will be processed asynchronously. You'll receive an email with a download link.
          </div>
        )}

        <div className="form-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => { onExport(selected, format); onClose() }} disabled={selected.length === 0}>
            Export {format.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  )
}
