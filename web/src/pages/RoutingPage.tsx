const RULES = [
  { priority: 1, name: 'EU Tier-1 Specificity',  desc: 'DE, AT, CH → AlphaFX Pro (primary), TradingHub (fallback)', weight: 40, type: 'specificity', color: '#4facfe' },
  { priority: 2, name: 'MENA Weight-Based',       desc: 'SA, AE, EG → ForexDirect 60% / CryptoLeads+ 40%',          weight: 60, type: 'weighted',    color: '#a78bfa' },
  { priority: 3, name: 'APAC Flow Control',        desc: 'TH, ID, IN → CryptoLeads+ with 300/day cap',               weight: 30, type: 'flow',        color: '#34d399' },
  { priority: 4, name: 'LATAM Default',            desc: 'BR, MX, CO → BinaryWorld → MarketPlus (failover)',         weight: 20, type: 'failover',    color: '#fbbf24' },
  { priority: 5, name: 'Global Overflow',          desc: 'All remaining → MarketPlus → TradingHub',                  weight:  0, type: 'overflow',    color: '#f87171' },
]

const CAPS = [
  { broker: 'AlphaFX Pro',  used: 312, cap: 500 },
  { broker: 'TradingHub',   used: 287, cap: 400 },
  { broker: 'CryptoLeads+', used: 198, cap: 300 },
  { broker: 'ForexDirect',  used: 174, cap: 250 },
  { broker: 'BinaryWorld',  used: 143, cap: 200 },
  { broker: 'MarketPlus',   used:  89, cap: 150 },
]

const FAILOVER = ['AlphaFX Pro', 'TradingHub', 'CryptoLeads+', 'MarketPlus']

export default function RoutingPage() {
  return (
    <div className="page-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Routing Rules</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            {RULES.length} active rules · priority-based distribution
          </p>
        </div>
        <button className="btn-primary" style={{ fontSize: 12, padding: '8px 18px' }}>+ Create Rule</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Rules list */}
        <div className="glass-card">
          <div className="section-label">Distribution Rules</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {RULES.map(r => (
              <div key={r.priority} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 14,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                cursor: 'pointer', transition: 'background 0.2s, border-color 0.2s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = `${r.color}33` }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)' }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: r.color,
                }}>{r.priority}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{r.desc}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {r.weight > 0 && (
                    <div style={{ fontSize: 20, fontWeight: 700, color: r.color, lineHeight: 1 }}>{r.weight}%</div>
                  )}
                  <span className={`status-badge ${
                    r.type === 'specificity' ? 'qualified' :
                    r.type === 'weighted'    ? 'delivered' :
                    r.type === 'flow'        ? 'processing' : 'new'
                  }`} style={{ marginTop: 4 }}>{r.type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cap overview */}
        <div className="glass-card">
          <div className="section-label">Cap Overview (Today)</div>
          {CAPS.map(c => {
            const pct = c.used / c.cap * 100
            return (
              <div key={c.broker} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{c.broker}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{c.used} / {c.cap}</span>
                </div>
                <div className="score-track">
                  <div className="score-fill" style={{
                    width: `${pct}%`,
                    background: pct > 90 ? 'var(--grad-rose)' : pct > 70 ? 'linear-gradient(135deg,#fbbf24,#f59e0b)' : 'var(--grad-blue)',
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Failover chain */}
      <div className="glass-card">
        <div className="section-label">Failover Chain</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {FAILOVER.map((b, i) => (
            <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 12, padding: '10px 18px',
              }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2 }}>Priority {i + 1}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{b}</div>
              </div>
              {i < FAILOVER.length - 1 && (
                <span style={{ color: 'var(--text-3)', fontSize: 20 }}>→</span>
              )}
            </div>
          ))}
          <span className="status-badge inactive" style={{ marginLeft: 4 }}>end of chain</span>
        </div>
      </div>
    </div>
  )
}
