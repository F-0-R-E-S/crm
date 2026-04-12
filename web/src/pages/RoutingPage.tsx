import { useState } from 'react'

interface Rule {
  priority: number
  name: string
  desc: string
  weight: number
  type: 'specificity' | 'weighted' | 'flow' | 'failover' | 'overflow'
  color: string
}

const INITIAL_RULES: Rule[] = [
  { priority: 1, name: 'EU Tier-1 Specificity', desc: 'DE, AT, CH → AlphaFX Pro (primary), TradingHub (fallback)', weight: 40, type: 'specificity', color: '#4facfe' },
  { priority: 2, name: 'MENA Weight-Based', desc: 'SA, AE, EG → ForexDirect 60% / CryptoLeads+ 40%', weight: 60, type: 'weighted', color: '#a78bfa' },
  { priority: 3, name: 'APAC Flow Control', desc: 'TH, ID, IN → CryptoLeads+ with 300/day cap', weight: 30, type: 'flow', color: '#34d399' },
  { priority: 4, name: 'LATAM Default', desc: 'BR, MX, CO → BinaryWorld → MarketPlus (failover)', weight: 20, type: 'failover', color: '#fbbf24' },
  { priority: 5, name: 'Global Overflow', desc: 'All remaining → MarketPlus → TradingHub', weight: 0, type: 'overflow', color: '#f87171' },
]

const CAPS = [
  { broker: 'AlphaFX Pro', used: 312, cap: 500 },
  { broker: 'TradingHub', used: 287, cap: 400 },
  { broker: 'CryptoLeads+', used: 198, cap: 300 },
  { broker: 'ForexDirect', used: 174, cap: 250 },
  { broker: 'BinaryWorld', used: 143, cap: 200 },
  { broker: 'MarketPlus', used: 89, cap: 150 },
]

const FAILOVER = ['AlphaFX Pro', 'TradingHub', 'CryptoLeads+', 'MarketPlus']

const RULE_TYPES: Array<Rule['type']> = ['specificity', 'weighted', 'flow', 'failover', 'overflow']

export default function RoutingPage() {
  const [rules, setRules] = useState<Rule[]>(INITIAL_RULES)
  const [showCreate, setShowCreate] = useState(false)
  const [createSuccess, setCreateSuccess] = useState('')
  const [form, setForm] = useState({
    name: '',
    priority: 6,
    type: 'specificity' as Rule['type'],
    countries: 'US, CA',
    primary: 'AlphaFX Pro',
    fallback: 'TradingHub',
    weight: 40,
  })

  return (
    <div className="page-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Routing Rules</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            {rules.length} active rules · priority-based distribution
          </p>
        </div>
        <button
          className="btn-primary"
          style={{ fontSize: 12, padding: '8px 18px' }}
          onClick={() => {
            setCreateSuccess('')
            setShowCreate(true)
          }}
        >
          + Create Rule
        </button>
      </div>

      {createSuccess && (
        <div className="form-alert form-alert-success" style={{ marginBottom: 16 }}>
          {createSuccess}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="glass-card">
          <div className="section-label">Distribution Rules</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rules.map((r) => (
              <div
                key={`${r.priority}-${r.name}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 14,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  cursor: 'pointer', transition: 'background 0.2s, border-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.borderColor = `${r.color}33`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                }}
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
                    r.type === 'specificity' ? 'qualified'
                      : r.type === 'weighted' ? 'delivered'
                        : r.type === 'flow' ? 'processing' : 'new'
                  }`} style={{ marginTop: 4 }}>{r.type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <div className="section-label">Cap Overview (Today)</div>
          {CAPS.map((c) => {
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
          <span className="status-badge invalid" style={{ marginLeft: 4 }}>end of chain</span>
        </div>
      </div>

      {showCreate && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <form
            className="modal-box"
            style={{ maxWidth: 760 }}
            onSubmit={(e) => {
              e.preventDefault()

              const countries = form.countries
                .split(',')
                .map((item) => item.trim().toUpperCase())
                .filter(Boolean)
                .join(', ')

              const newRule: Rule = {
                priority: form.priority,
                name: form.name.trim(),
                desc: `${countries || 'All countries'} → ${form.primary} (primary), ${form.fallback} (fallback)`,
                weight: form.weight,
                type: form.type,
                color: '#22d3ee',
              }

              setRules((prev) => [...prev, newRule].sort((a, b) => a.priority - b.priority))
              setCreateSuccess(`Rule “${newRule.name}” created in routing preview.`)
              setForm({
                name: '',
                priority: prevPriority(rules),
                type: 'specificity',
                countries: 'US, CA',
                primary: 'AlphaFX Pro',
                fallback: 'TradingHub',
                weight: 40,
              })
              setShowCreate(false)
            }}
          >
            <div className="form-header">
              <div>
                <div className="form-title">Create Routing Rule</div>
                <div className="form-subtitle">Define matching logic, priority, and broker fallback chain.</div>
              </div>
              <button
                type="button"
                className="btn-ghost"
                style={{ width: 32, height: 32, borderRadius: 16, padding: 0, justifyContent: 'center' }}
                onClick={() => setShowCreate(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="form-grid form-grid-2">
              <div className="form-field">
                <label className="form-label" htmlFor="rule-name">Rule Name</label>
                <input
                  id="rule-name"
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="US Forex Priority"
                  required
                  autoFocus
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="rule-priority">Priority</label>
                <input
                  id="rule-priority"
                  className="form-control"
                  type="number"
                  min={1}
                  value={form.priority}
                  onChange={(e) => setForm((prev) => ({ ...prev, priority: Math.max(1, Number(e.target.value) || 1) }))}
                  required
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="rule-type">Rule Type</label>
                <select
                  id="rule-type"
                  className="form-control"
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as Rule['type'] }))}
                >
                  {RULE_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="rule-weight">Weight (%)</label>
                <input
                  id="rule-weight"
                  className="form-control"
                  type="number"
                  min={0}
                  max={100}
                  value={form.weight}
                  onChange={(e) => setForm((prev) => ({ ...prev, weight: Math.max(0, Number(e.target.value) || 0) }))}
                />
              </div>

              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" htmlFor="rule-countries">Countries (comma-separated)</label>
                <input
                  id="rule-countries"
                  className="form-control"
                  value={form.countries}
                  onChange={(e) => setForm((prev) => ({ ...prev, countries: e.target.value }))}
                  placeholder="US, GB, CA"
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="rule-primary">Primary Broker</label>
                <input
                  id="rule-primary"
                  className="form-control"
                  value={form.primary}
                  onChange={(e) => setForm((prev) => ({ ...prev, primary: e.target.value }))}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="rule-fallback">Fallback Broker</label>
                <input
                  id="rule-fallback"
                  className="form-control"
                  value={form.fallback}
                  onChange={(e) => setForm((prev) => ({ ...prev, fallback: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={!form.name.trim() || !form.primary.trim()}>
                Create Rule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function prevPriority(rules: Rule[]) {
  const maxPriority = rules.reduce((acc, rule) => Math.max(acc, rule.priority), 0)
  return maxPriority + 1
}
