import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Link } from 'react-router-dom'
import type { DashboardKPIs, KPITile, CapStatus } from '../types/analytics'

// ─── Canvas chart hook ───
function useChart(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  deps: unknown[] = [],
) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    draw(ctx, rect.width, rect.height)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef, draw, ...deps])
}

// ─── Multi-line chart ───
function LineChart({ colors, labels, datasets, height = 220 }: { colors: string[]; labels: string[]; datasets: number[][]; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const draw = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number) => {
    const pad = { top: 16, right: 20, bottom: 32, left: 48 }
    const cW = W - pad.left - pad.right
    const cH = H - pad.top - pad.bottom

    let maxVal = 0
    datasets.forEach(d => d.forEach(v => (maxVal = Math.max(maxVal, v))))
    maxVal = Math.ceil(maxVal / 200) * 200 || 1000

    for (let i = 0; i <= 5; i++) {
      const y = pad.top + cH - (i / 5) * cH
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y)
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1; ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.font = '10px Inter'; ctx.textAlign = 'right'
      ctx.fillText(String(Math.round((i / 5) * maxVal)), pad.left - 6, y + 4)
    }

    const step = Math.ceil(labels.length / 8)
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.font = '10px Inter'; ctx.textAlign = 'center'
    labels.forEach((l, i) => {
      if (i % step === 0) ctx.fillText(l, pad.left + (i / (labels.length - 1)) * cW, H - pad.bottom + 16)
    })

    datasets.forEach((data, di) => {
      const pts = data.map((v, i) => ({
        x: pad.left + (i / (data.length - 1)) * cW,
        y: pad.top + cH - (v / maxVal) * cH,
      }))
      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH)
      grad.addColorStop(0, colors[di] + '44'); grad.addColorStop(1, colors[di] + '00')
      ctx.beginPath(); ctx.moveTo(pts[0].x, pad.top + cH)
      pts.forEach(p => ctx.lineTo(p.x, p.y))
      ctx.lineTo(pts[pts.length - 1].x, pad.top + cH); ctx.closePath()
      ctx.fillStyle = grad; ctx.fill()

      ctx.beginPath()
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
      ctx.strokeStyle = colors[di]; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke()
      const last = pts[pts.length - 1]
      ctx.beginPath(); ctx.arc(last.x, last.y, 4, 0, Math.PI * 2); ctx.fillStyle = colors[di]; ctx.fill()
    })
  }, [colors, labels, datasets])
  useChart(ref, draw, [labels, datasets])
  return <canvas ref={ref} style={{ width: '100%', height }} />
}

// ─── Bar chart ───
function BarChart({ items, color = '#4facfe', height = 180 }: { items: { label: string; value: number }[]; color?: string; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const draw = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number) => {
    const pad = { top: 10, right: 10, bottom: 36, left: 48 }
    const cW = W - pad.left - pad.right
    const cH = H - pad.top - pad.bottom
    const maxVal = Math.max(...items.map(i => i.value), 1)
    const barW = Math.min(40, (cW / items.length) * 0.7)
    const gap = (cW - barW * items.length) / (items.length + 1)

    for (let i = 0; i <= 4; i++) {
      const y = pad.top + cH - (i / 4) * cH
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y)
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1; ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.font = '10px Inter'; ctx.textAlign = 'right'
      ctx.fillText(String(Math.round((i / 4) * maxVal)), pad.left - 6, y + 4)
    }

    items.forEach((item, i) => {
      const x = pad.left + gap + i * (barW + gap)
      const barH = (item.value / maxVal) * cH
      const grad = ctx.createLinearGradient(x, pad.top + cH - barH, x, pad.top + cH)
      grad.addColorStop(0, color); grad.addColorStop(1, color + '33')
      ctx.beginPath()
      ctx.roundRect(x, pad.top + cH - barH, barW, barH, [4, 4, 0, 0])
      ctx.fillStyle = grad; ctx.fill()

      ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.font = '10px Inter'; ctx.textAlign = 'center'
      ctx.fillText(item.label, x + barW / 2, H - pad.bottom + 14)
    })
  }, [items, color])
  useChart(ref, draw, [items])
  return <canvas ref={ref} style={{ width: '100%', height }} />
}

// ─── Gauge ───
function GaugeWidget({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 80, height: 40, margin: '0 auto 8px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '40px 40px 0 0', background: 'var(--glass-bright)' }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
          borderRadius: '40px 40px 0 0', overflow: 'hidden',
          transform: `rotate(${(pct / 100) * 180 - 180}deg)`, transformOrigin: 'bottom center',
          background: color, transition: 'transform 0.5s ease-out',
        }} />
        <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', fontSize: 14, fontWeight: 700, color }}>{Math.round(pct)}%</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{label}</div>
      <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{value.toLocaleString()} / {max.toLocaleString()}</div>
    </div>
  )
}

// ─── Data generation (mock until API ready) ───
function buildSeries(days: number) {
  const labels = Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - i - 1))
    return `${d.getMonth() + 1}/${d.getDate()}`
  })
  const leads = labels.map((_, i) => Math.max(260, Math.round(780 + Math.sin(i / 3.2) * 170 + i * 6)))
  const conversions = leads.map((v, i) => Math.max(18, Math.round(v * (0.095 + (i % 6) * 0.004))))
  const revenue = conversions.map(c => Math.round(c * (280 + Math.random() * 60)))
  const fraudBlocked = leads.map(v => Math.round(v * (0.05 + Math.random() * 0.03)))
  return { labels, leads, conversions, revenue, fraudBlocked }
}

function buildBrokerData() {
  return [
    { name: 'AlphaFX Pro', leads: 9360, ftd: 1329, cr: 14.2, revenue: 18420, cost: 9360, roi: 96.8, avgResp: 1240 },
    { name: 'TradingHub', leads: 8610, ftd: 1016, cr: 11.8, revenue: 14310, cost: 8610, roi: 66.2, avgResp: 2100 },
    { name: 'ForexDirect', leads: 5220, ftd: 851, cr: 16.3, revenue: 12640, cost: 5220, roi: 142.1, avgResp: 890 },
    { name: 'CryptoLeads+', leads: 5940, ftd: 558, cr: 9.4, revenue: 8880, cost: 5940, roi: 49.5, avgResp: 3200 },
    { name: 'BinaryWorld', leads: 4290, ftd: 373, cr: 8.7, revenue: 6210, cost: 4290, roi: 44.8, avgResp: 4100 },
    { name: 'MarketPlus', leads: 2670, ftd: 323, cr: 12.1, revenue: 4840, cost: 2670, roi: 81.3, avgResp: 1800 },
  ]
}

function buildCapData(): CapStatus[] {
  return [
    { broker_id: '1', broker_name: 'AlphaFX Pro', daily_cap: 500, daily_used: 437, daily_pct: 87.4, total_cap: 10000, total_used: 9360, total_pct: 93.6, eta_full_minutes: 28, fill_rate_per_hour: 45, status: 'critical' },
    { broker_id: '2', broker_name: 'TradingHub', daily_cap: 400, daily_used: 312, daily_pct: 78.0, total_cap: 12000, total_used: 8610, total_pct: 71.8, eta_full_minutes: 120, fill_rate_per_hour: 32, status: 'warning' },
    { broker_id: '3', broker_name: 'ForexDirect', daily_cap: 300, daily_used: 189, daily_pct: 63.0, total_cap: 8000, total_used: 5220, total_pct: 65.3, fill_rate_per_hour: 22, status: 'normal' },
    { broker_id: '4', broker_name: 'CryptoLeads+', daily_cap: 350, daily_used: 350, daily_pct: 100, total_cap: 7000, total_used: 5940, total_pct: 84.9, fill_rate_per_hour: 0, status: 'full' },
    { broker_id: '5', broker_name: 'BinaryWorld', daily_cap: 250, daily_used: 124, daily_pct: 49.6, total_cap: 6000, total_used: 4290, total_pct: 71.5, fill_rate_per_hour: 15, status: 'normal' },
    { broker_id: '6', broker_name: 'MarketPlus', daily_cap: 200, daily_used: 78, daily_pct: 39.0, total_cap: 4000, total_used: 2670, total_pct: 66.8, fill_rate_per_hour: 10, status: 'normal' },
  ]
}

const COUNTRIES = [
  { c: 'DE', n: 'Germany', pct: 24 },
  { c: 'UA', n: 'Ukraine', pct: 18 },
  { c: 'PL', n: 'Poland', pct: 14 },
  { c: 'RO', n: 'Romania', pct: 11 },
  { c: 'TR', n: 'Turkey', pct: 9 },
  { c: 'BR', n: 'Brazil', pct: 7 },
]

function flag(cc: string) {
  return cc.split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
}

function capColor(status: string) {
  if (status === 'full') return '#f87171'
  if (status === 'critical') return '#f87171'
  if (status === 'warning') return '#fbbf24'
  return '#34d399'
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<7 | 30 | 90>(30)
  const [section, setSection] = useState<'overview' | 'brokers' | 'caps' | 'pnl'>('overview')
  const { labels, leads, conversions, revenue, fraudBlocked } = buildSeries(range)
  const brokers = buildBrokerData()
  const caps = buildCapData()

  const { data: kpiData } = useQuery({
    queryKey: ['analytics-kpis', range],
    queryFn: () => api.get<DashboardKPIs>(`/analytics/dashboard?range=${range}`),
    retry: false,
    staleTime: 30_000,
  })

  const totalLeads = leads.reduce((s, v) => s + v, 0)
  const totalConv = conversions.reduce((s, v) => s + v, 0)
  const totalRev = revenue.reduce((s, v) => s + v, 0)
  const totalFraud = fraudBlocked.reduce((s, v) => s + v, 0)

  const kpis: KPITile[] = kpiData?.tiles ?? [
    { key: 'leads', label: 'Leads Received', value: totalLeads, formatted: totalLeads.toLocaleString(), delta_pct: 18, delta_abs: 4320, trend: 'up', icon: '📥', color: '#4facfe' },
    { key: 'delivered', label: 'Leads Delivered', value: Math.round(totalLeads * 0.77), formatted: Math.round(totalLeads * 0.77).toLocaleString(), delta_pct: 22, delta_abs: 3890, trend: 'up', icon: '📤', color: '#34d399' },
    { key: 'ftd', label: 'FTD Count', value: totalConv, formatted: totalConv.toLocaleString(), delta_pct: 9, delta_abs: 280, trend: 'up', icon: '💰', color: '#a78bfa' },
    { key: 'cr', label: 'Conversion Rate', value: Number(((totalConv / totalLeads) * 100).toFixed(1)), formatted: `${((totalConv / totalLeads) * 100).toFixed(1)}%`, delta_pct: 1.2, delta_abs: 0.2, trend: 'up', icon: '📈', color: '#22d3ee' },
    { key: 'revenue', label: 'Revenue', value: totalRev, formatted: `$${(totalRev / 1000).toFixed(0)}K`, delta_pct: 14, delta_abs: 12400, trend: 'up', icon: '💵', color: '#34d399' },
    { key: 'rejected', label: 'Rejected', value: Math.round(totalLeads * 0.06), formatted: `${(6).toFixed(1)}%`, delta_pct: -2, delta_abs: -340, trend: 'down', icon: '⊘', color: '#fbbf24' },
    { key: 'fraud', label: 'Fraud Blocked', value: totalFraud, formatted: totalFraud.toLocaleString(), delta_pct: -4, delta_abs: -180, trend: 'down', icon: '🛡', color: '#f87171' },
    { key: 'resp', label: 'Avg Response', value: 1840, formatted: '1.8s', delta_pct: -8, delta_abs: -160, trend: 'down', icon: '⏱', color: '#a78bfa' },
  ]

  return (
    <div className="page-section">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Analytics</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>Last {range} days · auto-refresh 30s</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[7, 30, 90].map(v => (
            <button key={v} className={range === v ? 'btn-primary' : 'btn-ghost'} style={range === v ? { fontSize: 12, padding: '8px 16px' } : undefined} onClick={() => setRange(v as 7 | 30 | 90)}>{v}D</button>
          ))}
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--glass-border)' }}>
        {([['overview', 'Overview'], ['brokers', 'Broker ROI'], ['caps', 'Cap Status'], ['pnl', 'P&L']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setSection(key)} style={{
            padding: '8px 18px', fontSize: 12, fontWeight: section === key ? 600 : 400,
            color: section === key ? '#4facfe' : 'var(--text-2)', background: 'none', border: 'none',
            cursor: 'pointer', borderBottom: section === key ? '2px solid #4facfe' : '2px solid transparent', marginBottom: -1,
          }}>{label}</button>
        ))}
        <div style={{ flex: 1 }} />
        <Link to="/reports" style={{ fontSize: 12, color: '#4facfe', textDecoration: 'none', padding: '8px 12px', display: 'flex', alignItems: 'center' }}>
          Report Builder →
        </Link>
      </div>

      {section === 'overview' && (
        <>
          {/* KPI tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
            {kpis.slice(0, 8).map(k => (
              <div key={k.key} className="kpi-card" style={{ cursor: 'pointer' }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: 'var(--r-xl)', background: `radial-gradient(circle at 85% 15%, ${k.color}18, transparent 65%)`, pointerEvents: 'none' }} />
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginBottom: 10 }}>{k.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -1 }}>{k.formatted}</div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 3 }}>{k.label}</div>
                <div style={{
                  position: 'absolute', top: 14, right: 14, fontSize: 10, fontWeight: 600,
                  padding: '2px 7px', borderRadius: 999,
                  background: k.trend === 'up' ? 'rgba(52,211,153,0.14)' : k.trend === 'down' ? 'rgba(248,113,113,0.14)' : 'rgba(255,255,255,0.06)',
                  color: k.trend === 'up' ? '#34d399' : k.trend === 'down' ? '#f87171' : 'var(--text-3)',
                }}>
                  {k.trend === 'up' ? '+' : ''}{k.delta_pct}%
                </div>
              </div>
            ))}
          </div>

          {/* Main chart */}
          <div className="glass-card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="section-label" style={{ margin: 0 }}>Leads, Conversions & Revenue — {range} Days</div>
              <div style={{ display: 'flex', gap: 16 }}>
                {[{ c: '#4facfe', l: 'Leads' }, { c: '#a78bfa', l: 'Conversions' }, { c: '#34d399', l: 'Revenue (÷100)' }].map(s => (
                  <span key={s.l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-2)' }}>
                    <span style={{ width: 10, height: 3, borderRadius: 2, background: s.c, display: 'inline-block' }} /> {s.l}
                  </span>
                ))}
              </div>
            </div>
            <LineChart colors={['#4facfe', '#a78bfa', '#34d399']} labels={labels} datasets={[leads, conversions, revenue.map(r => Math.round(r / 100))]} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Countries */}
            <div className="glass-card">
              <div className="section-label">Top Countries</div>
              {COUNTRIES.map(c => (
                <div key={c.c} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{flag(c.c)} {c.n}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{c.pct}%</span>
                  </div>
                  <div className="score-track"><div className="score-fill" style={{ width: `${c.pct * 4}%`, background: 'var(--grad-blue)' }} /></div>
                </div>
              ))}
            </div>

            {/* Fraud blocked bar chart */}
            <div className="glass-card">
              <div className="section-label">Fraud Blocked — Daily</div>
              <BarChart items={labels.slice(-14).map((l, i) => ({ label: l, value: fraudBlocked.slice(-14)[i] }))} color="#f87171" />
            </div>
          </div>
        </>
      )}

      {section === 'brokers' && (
        <>
          {/* Broker ROI comparison */}
          <div className="glass-card" style={{ marginBottom: 20 }}>
            <div className="section-label">Broker ROI Comparison</div>
            <BarChart items={brokers.map(b => ({ label: b.name.split(' ')[0], value: b.roi }))} color="#4facfe" height={200} />
          </div>

          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px 10px' }}><div className="section-label">Broker Performance</div></div>
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Broker</th>
                  <th>Leads</th>
                  <th>FTD</th>
                  <th>CR%</th>
                  <th>Revenue</th>
                  <th>Cost</th>
                  <th>Profit</th>
                  <th>ROI%</th>
                  <th>Avg Resp</th>
                </tr>
              </thead>
              <tbody>
                {brokers.map(b => {
                  const profit = b.revenue - b.cost
                  return (
                    <tr key={b.name}>
                      <td className="td-primary" style={{ fontWeight: 500 }}>{b.name}</td>
                      <td>{b.leads.toLocaleString()}</td>
                      <td>{b.ftd.toLocaleString()}</td>
                      <td style={{ fontWeight: 600, color: b.cr > 12 ? '#34d399' : '#fbbf24' }}>{b.cr}%</td>
                      <td style={{ fontWeight: 600, color: '#34d399' }}>${b.revenue.toLocaleString()}</td>
                      <td>${b.cost.toLocaleString()}</td>
                      <td style={{ fontWeight: 600, color: profit > 0 ? '#34d399' : '#f87171' }}>${profit.toLocaleString()}</td>
                      <td style={{ fontWeight: 600, color: b.roi > 80 ? '#34d399' : b.roi > 40 ? '#fbbf24' : '#f87171' }}>{b.roi}%</td>
                      <td style={{ color: b.avgResp > 3000 ? '#f87171' : 'var(--text-2)' }}>{(b.avgResp / 1000).toFixed(1)}s</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {section === 'caps' && (
        <>
          {/* Cap Gauges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 20 }}>
            {caps.map(c => (
              <div key={c.broker_id} className="glass-card" style={{ textAlign: 'center', padding: 16 }}>
                <GaugeWidget value={c.daily_used} max={c.daily_cap} label={c.broker_name} color={capColor(c.status)} />
                {c.eta_full_minutes != null && c.status !== 'full' && (
                  <div style={{ marginTop: 6, fontSize: 10, color: c.status === 'critical' ? '#f87171' : '#fbbf24' }}>
                    Full in ~{c.eta_full_minutes}m
                  </div>
                )}
                {c.status === 'full' && (
                  <div style={{ marginTop: 6, fontSize: 10, fontWeight: 600, color: '#f87171' }}>CAP FULL</div>
                )}
              </div>
            ))}
          </div>

          {/* Cap table */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px 10px' }}><div className="section-label">Cap Fill Status</div></div>
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Broker</th>
                  <th>Daily (used/cap)</th>
                  <th>Daily %</th>
                  <th>Total (used/cap)</th>
                  <th>Fill Rate/h</th>
                  <th>ETA Full</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {caps.map(c => (
                  <tr key={c.broker_id}>
                    <td className="td-primary">{c.broker_name}</td>
                    <td>{c.daily_used}/{c.daily_cap}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--glass-bright)', maxWidth: 80 }}>
                          <div style={{ width: `${Math.min(c.daily_pct, 100)}%`, height: '100%', borderRadius: 2, background: capColor(c.status) }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: capColor(c.status) }}>{c.daily_pct}%</span>
                      </div>
                    </td>
                    <td>{c.total_used.toLocaleString()}/{c.total_cap.toLocaleString()}</td>
                    <td>{c.fill_rate_per_hour}/h</td>
                    <td style={{ color: c.eta_full_minutes && c.eta_full_minutes < 60 ? '#f87171' : 'var(--text-2)' }}>
                      {c.status === 'full' ? '—' : c.eta_full_minutes ? `${c.eta_full_minutes}m` : '—'}
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                        background: `${capColor(c.status)}22`, color: capColor(c.status),
                        textTransform: 'uppercase',
                      }}>{c.status}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-ghost" style={{ fontSize: 10, padding: '3px 8px' }}>Adjust</button>
                        {c.status !== 'full' && <button className="btn-ghost" style={{ fontSize: 10, padding: '3px 8px', color: '#f87171' }}>Pause</button>}
                        {c.status === 'full' && <button className="btn-ghost" style={{ fontSize: 10, padding: '3px 8px', color: '#34d399' }}>Reset</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {section === 'pnl' && (
        <>
          {/* P&L Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Total Revenue', value: `$${(totalRev / 1000).toFixed(0)}K`, color: '#34d399' },
              { label: 'Total Cost', value: `$${(totalLeads * 1.0 / 1000).toFixed(0)}K`, color: '#fbbf24' },
              { label: 'Profit', value: `$${((totalRev - totalLeads) / 1000).toFixed(0)}K`, color: totalRev - totalLeads > 0 ? '#34d399' : '#f87171' },
              { label: 'Margin', value: `${(((totalRev - totalLeads) / totalRev) * 100).toFixed(1)}%`, color: '#a78bfa' },
            ].map(k => (
              <div key={k.label} className="kpi-card">
                <div style={{ fontSize: 22, fontWeight: 700, color: k.color, letterSpacing: -1 }}>{k.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* P&L chart */}
          <div className="glass-card" style={{ marginBottom: 20 }}>
            <div className="section-label">Revenue vs Cost — {range} Days</div>
            <LineChart colors={['#34d399', '#f87171']} labels={labels} datasets={[revenue.map(r => Math.round(r / 100)), leads]} />
          </div>

          {/* Affiliate P&L table */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px 10px' }}><div className="section-label">Affiliate P&L</div></div>
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Affiliate</th>
                  <th>Leads</th>
                  <th>FTD</th>
                  <th>FTD Rate</th>
                  <th>Revenue</th>
                  <th>Cost</th>
                  <th>Profit</th>
                  <th>Margin%</th>
                  <th>EPC</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'TrafficKing', leads: 8400, ftd: 1092, rev: 16380, cost: 8400, epc: 1.95 },
                  { name: 'LeadGen Pro', leads: 6200, ftd: 744, rev: 11160, cost: 7440, epc: 1.80 },
                  { name: 'ClickMedia', leads: 4800, ftd: 528, rev: 7920, cost: 4800, epc: 1.65 },
                  { name: 'AffPro', leads: 3600, ftd: 396, rev: 5940, cost: 4320, epc: 1.65 },
                  { name: 'Media Buyer X', leads: 2400, ftd: 216, rev: 3240, cost: 2880, epc: 1.35 },
                ].map(a => {
                  const profit = a.rev - a.cost
                  const margin = (profit / a.rev) * 100
                  const ftdRate = (a.ftd / a.leads) * 100
                  return (
                    <tr key={a.name}>
                      <td className="td-primary">{a.name}</td>
                      <td>{a.leads.toLocaleString()}</td>
                      <td>{a.ftd.toLocaleString()}</td>
                      <td style={{ fontWeight: 600, color: ftdRate > 12 ? '#34d399' : '#fbbf24' }}>{ftdRate.toFixed(1)}%</td>
                      <td style={{ fontWeight: 600, color: '#34d399' }}>${a.rev.toLocaleString()}</td>
                      <td>${a.cost.toLocaleString()}</td>
                      <td style={{ fontWeight: 600, color: profit > 0 ? '#34d399' : '#f87171' }}>${profit.toLocaleString()}</td>
                      <td style={{ fontWeight: 600, color: margin > 10 ? '#34d399' : margin > 0 ? '#fbbf24' : '#f87171' }}>{margin.toFixed(1)}%</td>
                      <td>${a.epc}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
