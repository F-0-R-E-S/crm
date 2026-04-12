import { useState, useMemo } from 'react'
import { REPORT_DIMENSIONS, REPORT_METRICS } from '../types/analytics'

interface ReportConfig {
  dimensions: string[]
  metrics: string[]
  filters: Record<string, string>
  sort?: { field: string; direction: 'asc' | 'desc' }
  name?: string
}

function DraggableChip({ item, type, onRemove }: { item: { key: string; label: string }; type: 'dim' | 'metric'; onRemove: () => void }) {
  return (
    <span
      draggable
      onDragStart={e => e.dataTransfer.setData('text/plain', JSON.stringify({ key: item.key, type }))}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 10px', borderRadius: 8, cursor: 'grab',
        background: type === 'dim' ? 'rgba(79,172,254,0.12)' : 'rgba(167,139,250,0.12)',
        color: type === 'dim' ? '#4facfe' : '#a78bfa',
        fontSize: 12, fontWeight: 500,
        border: `1px solid ${type === 'dim' ? 'rgba(79,172,254,0.25)' : 'rgba(167,139,250,0.25)'}`,
      }}
    >
      {item.label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: 12, opacity: 0.6 }}>✕</button>
    </span>
  )
}

function generateMockData(config: ReportConfig): Record<string, unknown>[] {
  const countries = ['DE', 'UA', 'PL', 'RO', 'TR', 'BR', 'GB', 'CA']
  const affiliates = ['TrafficKing', 'LeadGen Pro', 'ClickMedia', 'AffPro', 'Media Buyer X']
  const brokers = ['AlphaFX Pro', 'TradingHub', 'ForexDirect', 'CryptoLeads+']
  const statuses = ['new', 'delivered', 'rejected', 'fraud']
  const dates = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i)
    return d.toISOString().split('T')[0]
  })

  const dimValues: Record<string, string[]> = {
    country: countries, affiliate_id: affiliates, broker_id: brokers,
    status: statuses, date: dates, source: ['facebook', 'google', 'native', 'email'],
    utm_source: ['fb', 'ggl', 'tiktok', 'reddit'], device_type: ['desktop', 'mobile', 'tablet'],
    funnel_id: ['crypto-a', 'forex-b', 'cfd-c'], offer_id: ['offer-1', 'offer-2'],
    week: dates.filter((_, i) => i % 7 === 0), month: ['2026-03', '2026-02', '2026-01'],
    sale_status: ['ftd', 'no_deposit', 'pending'], utm_medium: ['cpc', 'cpm', 'organic'],
    utm_campaign: ['camp-1', 'camp-2', 'camp-3'],
  }

  const rows: Record<string, unknown>[] = []
  const primaryDim = config.dimensions[0]
  const vals = dimValues[primaryDim] ?? ['value1', 'value2', 'value3']

  for (const v of vals.slice(0, 10)) {
    const row: Record<string, unknown> = { [primaryDim]: v }
    for (const dim of config.dimensions.slice(1)) {
      const dVals = dimValues[dim] ?? ['a', 'b']
      row[dim] = dVals[Math.floor(Math.random() * dVals.length)]
    }
    for (const m of config.metrics) {
      const metric = REPORT_METRICS.find(rm => rm.key === m)
      if (!metric) continue
      switch (metric.format) {
        case 'currency': row[m] = Math.round(Math.random() * 20000 + 500); break
        case 'percent': row[m] = Number((Math.random() * 30 + 2).toFixed(1)); break
        case 'duration': row[m] = Math.round(Math.random() * 5000 + 200); break
        default: row[m] = Math.round(Math.random() * 2000 + 50)
      }
    }
    rows.push(row)
  }

  if (config.sort) {
    rows.sort((a, b) => {
      const va = (a[config.sort!.field] as number) ?? 0
      const vb = (b[config.sort!.field] as number) ?? 0
      return config.sort!.direction === 'asc' ? va - vb : vb - va
    })
  }
  return rows
}

function formatValue(value: unknown, metricKey: string): string {
  const metric = REPORT_METRICS.find(m => m.key === metricKey)
  if (!metric) return String(value ?? '')
  const num = Number(value)
  switch (metric.format) {
    case 'currency': return `$${num.toLocaleString()}`
    case 'percent': return `${num}%`
    case 'duration': return num >= 1000 ? `${(num / 1000).toFixed(1)}s` : `${num}ms`
    default: return num.toLocaleString()
  }
}

export default function ReportBuilderPage() {
  const [config, setConfig] = useState<ReportConfig>({
    dimensions: ['country'],
    metrics: ['leads_count', 'ftd_count', 'cr_pct', 'revenue'],
    filters: {},
    sort: { field: 'revenue', direction: 'desc' },
  })
  const [showSave, setShowSave] = useState(false)
  const [reportName, setReportName] = useState('')
  const [dimSearch, setDimSearch] = useState('')
  const [metricSearch, setMetricSearch] = useState('')

  const availableDims = useMemo(() =>
    REPORT_DIMENSIONS.filter(d => !config.dimensions.includes(d.key) && d.label.toLowerCase().includes(dimSearch.toLowerCase())),
    [config.dimensions, dimSearch]
  )
  const availableMetrics = useMemo(() =>
    REPORT_METRICS.filter(m => !config.metrics.includes(m.key) && m.label.toLowerCase().includes(metricSearch.toLowerCase())),
    [config.metrics, metricSearch]
  )

  const data = useMemo(() => generateMockData(config), [config])

  function addDim(key: string) { setConfig(c => ({ ...c, dimensions: [...c.dimensions, key] })) }
  function removeDim(key: string) { setConfig(c => ({ ...c, dimensions: c.dimensions.filter(d => d !== key) })) }
  function addMetric(key: string) { setConfig(c => ({ ...c, metrics: [...c.metrics, key] })) }
  function removeMetric(key: string) { setConfig(c => ({ ...c, metrics: c.metrics.filter(m => m !== key) })) }

  function handleDrop(e: React.DragEvent, target: 'dims' | 'metrics') {
    e.preventDefault()
    try {
      const { key, type } = JSON.parse(e.dataTransfer.getData('text/plain'))
      if (target === 'dims' && type === 'dim') addDim(key)
      if (target === 'metrics' && type === 'metric') addMetric(key)
    } catch { /* ignore */ }
  }

  return (
    <div className="page-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Report Builder</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>Drag dimensions and metrics to build custom reports</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-glass" style={{ fontSize: 12, padding: '7px 14px' }} onClick={() => setShowSave(true)}>💾 Save Report</button>
          <button className="btn-glass" style={{ fontSize: 12, padding: '7px 14px' }}>⬇ Export</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
        {/* Sidebar: Available items */}
        <div>
          {/* Dimensions */}
          <div className="glass-card" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4facfe', marginBottom: 8 }}>Dimensions</div>
            <input className="glass-input" placeholder="Search..." value={dimSearch} onChange={e => setDimSearch(e.target.value)} style={{ width: '100%', fontSize: 11, padding: '5px 8px', marginBottom: 8 }} />
            {availableDims.map(d => (
              <div
                key={d.key}
                draggable
                onDragStart={e => e.dataTransfer.setData('text/plain', JSON.stringify({ key: d.key, type: 'dim' }))}
                onClick={() => addDim(d.key)}
                style={{
                  padding: '6px 10px', borderRadius: 6, cursor: 'grab', fontSize: 12,
                  color: 'var(--text-2)', marginBottom: 2,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,172,254,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ color: '#4facfe', fontSize: 10 }}>⠿</span> {d.label}
              </div>
            ))}
          </div>

          {/* Metrics */}
          <div className="glass-card">
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a78bfa', marginBottom: 8 }}>Metrics</div>
            <input className="glass-input" placeholder="Search..." value={metricSearch} onChange={e => setMetricSearch(e.target.value)} style={{ width: '100%', fontSize: 11, padding: '5px 8px', marginBottom: 8 }} />
            {availableMetrics.map(m => (
              <div
                key={m.key}
                draggable
                onDragStart={e => e.dataTransfer.setData('text/plain', JSON.stringify({ key: m.key, type: 'metric' }))}
                onClick={() => addMetric(m.key)}
                style={{
                  padding: '6px 10px', borderRadius: 6, cursor: 'grab', fontSize: 12,
                  color: 'var(--text-2)', marginBottom: 2,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(167,139,250,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ color: '#a78bfa', fontSize: 10 }}>⠿</span> {m.label}
                <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase' }}>{m.format}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main area */}
        <div>
          {/* Drop zones */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, 'dims')}
              style={{
                flex: 1, minHeight: 44, padding: '8px 12px', borderRadius: 12,
                border: '2px dashed rgba(79,172,254,0.2)',
                background: 'rgba(79,172,254,0.03)',
                display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rows:</span>
              {config.dimensions.map(key => {
                const d = REPORT_DIMENSIONS.find(rd => rd.key === key)
                return d ? <DraggableChip key={key} item={d} type="dim" onRemove={() => removeDim(key)} /> : null
              })}
              {config.dimensions.length === 0 && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Drop dimensions here</span>}
            </div>

            <div
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, 'metrics')}
              style={{
                flex: 1, minHeight: 44, padding: '8px 12px', borderRadius: 12,
                border: '2px dashed rgba(167,139,250,0.2)',
                background: 'rgba(167,139,250,0.03)',
                display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Values:</span>
              {config.metrics.map(key => {
                const m = REPORT_METRICS.find(rm => rm.key === key)
                return m ? <DraggableChip key={key} item={m} type="metric" onRemove={() => removeMetric(key)} /> : null
              })}
              {config.metrics.length === 0 && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Drop metrics here</span>}
            </div>
          </div>

          {/* Results table */}
          {config.dimensions.length > 0 && config.metrics.length > 0 ? (
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="glass-table">
                  <thead>
                    <tr>
                      {config.dimensions.map(key => {
                        const d = REPORT_DIMENSIONS.find(rd => rd.key === key)
                        return <th key={key}>{d?.label ?? key}</th>
                      })}
                      {config.metrics.map(key => {
                        const m = REPORT_METRICS.find(rm => rm.key === key)
                        const isSort = config.sort?.field === key
                        return (
                          <th
                            key={key}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => setConfig(c => ({
                              ...c,
                              sort: c.sort?.field === key
                                ? { field: key, direction: c.sort.direction === 'asc' ? 'desc' : 'asc' }
                                : { field: key, direction: 'desc' },
                            }))}
                          >
                            {m?.label ?? key}
                            {isSort && <span style={{ marginLeft: 4, fontSize: 10, color: '#a78bfa' }}>{config.sort?.direction === 'asc' ? '▲' : '▼'}</span>}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, i) => (
                      <tr key={i}>
                        {config.dimensions.map(key => (
                          <td key={key} className="td-primary">{String(row[key] ?? '')}</td>
                        ))}
                        {config.metrics.map(key => (
                          <td key={key} style={{ fontWeight: 500 }}>{formatValue(row[key], key)}</td>
                        ))}
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr style={{ background: 'rgba(255,255,255,0.03)', fontWeight: 600 }}>
                      <td colSpan={config.dimensions.length} style={{ textAlign: 'right', color: 'var(--text-2)' }}>Total</td>
                      {config.metrics.map(key => {
                        const metric = REPORT_METRICS.find(m => m.key === key)
                        const total = data.reduce((s, r) => s + (Number(r[key]) || 0), 0)
                        const val = metric?.aggregation === 'avg' ? total / data.length : total
                        return <td key={key}>{formatValue(val, key)}</td>
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Build Your Report</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Select at least one dimension and one metric from the sidebar, or drag them to the drop zones above.</div>
            </div>
          )}
        </div>
      </div>

      {/* Save modal */}
      {showSave && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowSave(false)}>
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <div className="form-header"><div className="form-title">Save Report</div></div>
            <div className="form-field">
              <label className="form-label">Report Name</label>
              <input className="glass-input" value={reportName} onChange={e => setReportName(e.target.value)} placeholder="My custom report" autoFocus style={{ width: '100%', fontSize: 13 }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>
              {config.dimensions.length} dimensions, {config.metrics.length} metrics
            </div>
            <div className="form-actions">
              <button className="btn-ghost" onClick={() => setShowSave(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => { setShowSave(false); setReportName('') }} disabled={!reportName.trim()}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
