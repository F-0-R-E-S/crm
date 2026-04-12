import { useState } from 'react'
import { ALL_COLUMNS, COLUMN_GROUPS, type ColumnDef } from '../types/leads'

interface Props {
  selected: string[]
  onSave: (columns: string[]) => void
  onClose: () => void
}

export default function ColumnPicker({ selected, onSave, onClose }: Props) {
  const [cols, setCols] = useState<string[]>(selected)
  const [search, setSearch] = useState('')
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const filtered = search
    ? ALL_COLUMNS.filter(c => c.label.toLowerCase().includes(search.toLowerCase()) || c.key.includes(search.toLowerCase()))
    : ALL_COLUMNS

  const grouped = Object.keys(COLUMN_GROUPS).map(g => ({
    key: g,
    label: COLUMN_GROUPS[g],
    columns: filtered.filter(c => c.group === g),
  })).filter(g => g.columns.length > 0)

  function toggle(key: string) {
    setCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  function handleDragStart(idx: number) { setDragIdx(idx) }
  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    const updated = [...cols]
    const [item] = updated.splice(dragIdx, 1)
    updated.splice(idx, 0, item)
    setCols(updated)
    setDragIdx(idx)
  }
  function handleDragEnd() { setDragIdx(null) }

  const colMap = new Map<string, ColumnDef>(ALL_COLUMNS.map(c => [c.key, c]))

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 720, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="form-header">
          <div>
            <div className="form-title">Configure Columns</div>
            <div className="form-subtitle">{cols.length} of {ALL_COLUMNS.length} columns selected</div>
          </div>
          <button type="button" className="btn-ghost" style={{ width: 32, height: 32, borderRadius: 16, padding: 0, justifyContent: 'center' }} onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flex: 1, overflow: 'hidden' }}>
          {/* Available columns */}
          <div style={{ overflow: 'auto', paddingRight: 8 }}>
            <input
              className="glass-input"
              placeholder="Search columns..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', marginBottom: 12, fontSize: 12, padding: '8px 12px' }}
            />
            {grouped.map(g => (
              <div key={g.key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 6 }}>{g.label}</div>
                {g.columns.map(c => (
                  <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: cols.includes(c.key) ? 'var(--text-1)' : 'var(--text-2)', background: cols.includes(c.key) ? 'rgba(79,172,254,0.08)' : 'transparent', marginBottom: 2 }}>
                    <input type="checkbox" checked={cols.includes(c.key)} onChange={() => toggle(c.key)} style={{ accentColor: '#4facfe' }} />
                    {c.label}
                  </label>
                ))}
              </div>
            ))}
          </div>

          {/* Selected order */}
          <div style={{ overflow: 'auto', paddingLeft: 8, borderLeft: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 8 }}>Column Order (drag to reorder)</div>
            {cols.map((key, idx) => {
              const col = colMap.get(key)
              return (
                <div
                  key={key}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', borderRadius: 8, marginBottom: 3,
                    background: dragIdx === idx ? 'rgba(79,172,254,0.12)' : 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    cursor: 'grab', fontSize: 12, color: 'var(--text-1)',
                  }}
                >
                  <span style={{ color: 'var(--text-3)', fontSize: 10 }}>⠿</span>
                  <span style={{ flex: 1 }}>{col?.label ?? key}</span>
                  <button onClick={() => toggle(key)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 14, padding: 0 }}>✕</button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: 16 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => { onSave(cols); onClose() }}>Apply Columns</button>
        </div>
      </div>
    </div>
  )
}
