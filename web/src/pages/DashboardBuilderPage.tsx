import { useState, useCallback } from 'react'
import type { DashboardWidget, CustomDashboard } from '../types/analytics'

const WIDGET_TYPES: Array<{ type: DashboardWidget['type']; label: string; icon: string; defaultW: number; defaultH: number }> = [
  { type: 'kpi', label: 'KPI Card', icon: '📊', defaultW: 3, defaultH: 2 },
  { type: 'line', label: 'Line Chart', icon: '📈', defaultW: 6, defaultH: 4 },
  { type: 'bar', label: 'Bar Chart', icon: '📊', defaultW: 6, defaultH: 4 },
  { type: 'pie', label: 'Pie Chart', icon: '🥧', defaultW: 4, defaultH: 4 },
  { type: 'table', label: 'Data Table', icon: '📋', defaultW: 6, defaultH: 5 },
  { type: 'heatmap', label: 'Heatmap', icon: '🗺', defaultW: 6, defaultH: 4 },
  { type: 'gauge', label: 'Gauge', icon: '⏱', defaultW: 3, defaultH: 3 },
  { type: 'funnel', label: 'Funnel', icon: '🔽', defaultW: 4, defaultH: 4 },
  { type: 'sparkline', label: 'Sparkline', icon: '〰', defaultW: 3, defaultH: 2 },
  { type: 'text', label: 'Text Note', icon: '📝', defaultW: 3, defaultH: 2 },
]

const MOCK_DASHBOARDS: CustomDashboard[] = [
  {
    id: 'default-1',
    name: 'Operations Overview',
    auto_refresh_seconds: 30,
    is_team: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    widgets: [
      { id: 'w1', type: 'kpi', title: 'Leads Today', config: { metric: 'leads_count', period: 'today' }, x: 0, y: 0, w: 3, h: 2 },
      { id: 'w2', type: 'kpi', title: 'FTD Count', config: { metric: 'ftd_count', period: 'today' }, x: 3, y: 0, w: 3, h: 2 },
      { id: 'w3', type: 'kpi', title: 'Conversion Rate', config: { metric: 'cr_pct', period: 'today' }, x: 6, y: 0, w: 3, h: 2 },
      { id: 'w4', type: 'kpi', title: 'Revenue', config: { metric: 'revenue', period: 'today' }, x: 9, y: 0, w: 3, h: 2 },
      { id: 'w5', type: 'line', title: 'Lead Trend (7d)', config: { metrics: ['leads_count', 'ftd_count'], period: '7d' }, x: 0, y: 2, w: 8, h: 4 },
      { id: 'w6', type: 'pie', title: 'Leads by Country', config: { dimension: 'country', metric: 'leads_count' }, x: 8, y: 2, w: 4, h: 4 },
      { id: 'w7', type: 'table', title: 'Top Affiliates', config: { dimensions: ['affiliate_id'], metrics: ['leads_count', 'ftd_count', 'revenue'], limit: 10 }, x: 0, y: 6, w: 6, h: 5 },
      { id: 'w8', type: 'bar', title: 'Broker ROI', config: { dimension: 'broker_id', metric: 'roi_pct' }, x: 6, y: 6, w: 6, h: 5 },
    ],
  },
]

function WidgetCard({ widget, isEditing, onRemove, onEdit }: { widget: DashboardWidget; isEditing: boolean; onRemove: () => void; onEdit: () => void }) {
  const mockValues: Record<string, { value: string; delta: string }> = {
    'Leads Today': { value: '1,247', delta: '+12%' },
    'FTD Count': { value: '148', delta: '+8%' },
    'Conversion Rate': { value: '11.8%', delta: '+0.4%' },
    'Revenue': { value: '$22.4K', delta: '+15%' },
  }

  return (
    <div
      className="glass-card"
      style={{
        gridColumn: `span ${widget.w}`,
        gridRow: `span ${widget.h}`,
        padding: widget.type === 'kpi' ? 16 : 0,
        position: 'relative',
        overflow: 'hidden',
        minHeight: widget.h * 40,
      }}
    >
      {isEditing && (
        <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4, zIndex: 10 }}>
          <button onClick={onEdit} style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(79,172,254,0.2)', border: 'none', color: '#4facfe', fontSize: 10, cursor: 'pointer' }}>⚙</button>
          <button onClick={onRemove} style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(248,113,113,0.2)', border: 'none', color: '#f87171', fontSize: 10, cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {widget.type === 'kpi' && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6, fontWeight: 500 }}>{widget.title}</div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1 }}>{mockValues[widget.title]?.value ?? '—'}</div>
          {mockValues[widget.title] && (
            <div style={{ fontSize: 11, color: '#34d399', fontWeight: 600, marginTop: 4 }}>{mockValues[widget.title].delta}</div>
          )}
        </div>
      )}

      {widget.type === 'line' && (
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', marginBottom: 12 }}>{widget.title}</div>
          <div style={{ height: widget.h * 40 - 60, display: 'flex', alignItems: 'flex-end', gap: 2, padding: '0 4px' }}>
            {Array.from({ length: 14 }, (_, i) => {
              const h = 20 + Math.random() * 60 + i * 2
              return <div key={i} style={{ flex: 1, height: `${h}%`, background: 'linear-gradient(to top, rgba(79,172,254,0.15), rgba(79,172,254,0.4))', borderRadius: '3px 3px 0 0' }} />
            })}
          </div>
        </div>
      )}

      {widget.type === 'bar' && (
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', marginBottom: 12 }}>{widget.title}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['AlphaFX', 'TradingHub', 'ForexDirect', 'CryptoLeads+'].map((name, i) => {
              const pct = [96.8, 66.2, 142.1, 49.5][i]
              return (
                <div key={name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-2)', marginBottom: 3 }}>
                    <span>{name}</span><span style={{ fontWeight: 600, color: pct > 80 ? '#34d399' : '#fbbf24' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--glass-bright)' }}>
                    <div style={{ height: '100%', width: `${Math.min(pct / 1.5, 100)}%`, borderRadius: 3, background: pct > 80 ? 'var(--grad-blue)' : 'var(--grad-purple)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {widget.type === 'pie' && (
        <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 90, height: 90, borderRadius: '50%', background: `conic-gradient(#4facfe 0% 24%, #34d399 24% 42%, #a78bfa 42% 56%, #fbbf24 56% 67%, #f87171 67% 76%, #22d3ee 76% 83%, rgba(255,255,255,0.1) 83%)`, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>{widget.title}</div>
            {[{ l: 'DE', c: '#4facfe', p: 24 }, { l: 'UA', c: '#34d399', p: 18 }, { l: 'PL', c: '#a78bfa', p: 14 }, { l: 'RO', c: '#fbbf24', p: 11 }].map(c => (
              <div key={c.l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-2)', marginBottom: 3 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: c.c }} />
                {c.l} <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{c.p}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {widget.type === 'table' && (
        <div>
          <div style={{ padding: '12px 16px 8px', fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{widget.title}</div>
          <table className="glass-table" style={{ fontSize: 12 }}>
            <thead>
              <tr><th>Affiliate</th><th>Leads</th><th>FTD</th><th>Revenue</th></tr>
            </thead>
            <tbody>
              {[
                { n: 'TrafficKing', l: 8400, f: 1092, r: '$16.3K' },
                { n: 'LeadGen Pro', l: 6200, f: 744, r: '$11.2K' },
                { n: 'ClickMedia', l: 4800, f: 528, r: '$7.9K' },
                { n: 'AffPro', l: 3600, f: 396, r: '$5.9K' },
                { n: 'Media Buyer X', l: 2400, f: 216, r: '$3.2K' },
              ].map(a => (
                <tr key={a.n}>
                  <td className="td-primary">{a.n}</td>
                  <td>{a.l.toLocaleString()}</td>
                  <td>{a.f.toLocaleString()}</td>
                  <td style={{ fontWeight: 600, color: '#34d399' }}>{a.r}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!['kpi', 'line', 'bar', 'pie', 'table'].includes(widget.type) && (
        <div style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)', fontSize: 13 }}>
          {widget.title}
        </div>
      )}
    </div>
  )
}

export default function DashboardBuilderPage() {
  const [dashboards, setDashboards] = useState<CustomDashboard[]>(MOCK_DASHBOARDS)
  const [activeDashIdx, setActiveDashIdx] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [showAddWidget, setShowAddWidget] = useState(false)
  const [showCreateDash, setShowCreateDash] = useState(false)
  const [newDashName, setNewDashName] = useState('')

  const dash = dashboards[activeDashIdx]

  const addWidget = useCallback((type: DashboardWidget['type']) => {
    const wt = WIDGET_TYPES.find(w => w.type === type)!
    const widget: DashboardWidget = {
      id: `w-${Date.now()}`,
      type,
      title: `New ${wt.label}`,
      config: {},
      x: 0, y: 100, w: wt.defaultW, h: wt.defaultH,
    }
    setDashboards(prev => prev.map((d, i) => i === activeDashIdx ? { ...d, widgets: [...d.widgets, widget] } : d))
    setShowAddWidget(false)
  }, [activeDashIdx])

  const removeWidget = useCallback((widgetId: string) => {
    setDashboards(prev => prev.map((d, i) => i === activeDashIdx ? { ...d, widgets: d.widgets.filter(w => w.id !== widgetId) } : d))
  }, [activeDashIdx])

  function createDashboard() {
    const newDash: CustomDashboard = {
      id: `dash-${Date.now()}`, name: newDashName || 'New Dashboard',
      widgets: [], auto_refresh_seconds: 30, is_team: false,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }
    setDashboards(prev => [...prev, newDash])
    setActiveDashIdx(dashboards.length)
    setShowCreateDash(false)
    setNewDashName('')
    setIsEditing(true)
  }

  return (
    <div className="page-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Dashboards</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            {dash?.auto_refresh_seconds ? `Auto-refresh ${dash.auto_refresh_seconds}s` : 'Custom dashboards'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isEditing && (
            <button className="btn-primary" style={{ fontSize: 12, padding: '7px 14px' }} onClick={() => setShowAddWidget(true)}>+ Add Widget</button>
          )}
          <button className={isEditing ? 'btn-primary' : 'btn-glass'} style={{ fontSize: 12, padding: '7px 14px' }} onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? '✓ Done' : '✏ Edit'}
          </button>
          <button className="btn-glass" style={{ fontSize: 12, padding: '7px 14px' }} onClick={() => setShowCreateDash(true)}>+ New Dashboard</button>
        </div>
      </div>

      {/* Dashboard tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--glass-border)' }}>
        {dashboards.map((d, i) => (
          <button key={d.id} onClick={() => setActiveDashIdx(i)} style={{
            padding: '8px 16px', fontSize: 12, fontWeight: activeDashIdx === i ? 600 : 400,
            color: activeDashIdx === i ? '#4facfe' : 'var(--text-2)', background: 'none', border: 'none',
            cursor: 'pointer', borderBottom: activeDashIdx === i ? '2px solid #4facfe' : '2px solid transparent', marginBottom: -1,
          }}>
            {d.name} {d.is_team && <span style={{ fontSize: 9, color: 'var(--text-3)' }}>TEAM</span>}
          </button>
        ))}
      </div>

      {/* Widget grid */}
      {dash && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: 14,
          gridAutoRows: 40,
        }}>
          {dash.widgets.map(w => (
            <WidgetCard key={w.id} widget={w} isEditing={isEditing} onRemove={() => removeWidget(w.id)} onEdit={() => {}} />
          ))}
        </div>
      )}

      {dash && dash.widgets.length === 0 && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Empty Dashboard</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Click "Edit" then "Add Widget" to start building.</div>
        </div>
      )}

      {/* Add widget modal */}
      {showAddWidget && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowAddWidget(false)}>
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <div className="form-header">
              <div className="form-title">Add Widget</div>
              <button className="btn-ghost" style={{ width: 32, height: 32, borderRadius: 16, padding: 0, justifyContent: 'center' }} onClick={() => setShowAddWidget(false)}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {WIDGET_TYPES.map(wt => (
                <button
                  key={wt.type}
                  onClick={() => addWidget(wt.type)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px', borderRadius: 10, border: '1px solid var(--glass-border)',
                    background: 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,172,254,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                >
                  <span style={{ fontSize: 20 }}>{wt.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{wt.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{wt.defaultW}×{wt.defaultH} cells</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create dashboard modal */}
      {showCreateDash && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowCreateDash(false)}>
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <div className="form-header"><div className="form-title">New Dashboard</div></div>
            <div className="form-field">
              <label className="form-label">Dashboard Name</label>
              <input className="glass-input" value={newDashName} onChange={e => setNewDashName(e.target.value)} placeholder="My Dashboard" autoFocus style={{ width: '100%', fontSize: 13 }} />
            </div>
            <div className="form-actions">
              <button className="btn-ghost" onClick={() => setShowCreateDash(false)}>Cancel</button>
              <button className="btn-primary" onClick={createDashboard}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
