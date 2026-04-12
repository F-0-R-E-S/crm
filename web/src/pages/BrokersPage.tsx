import { useState } from 'react'

const BROKERS = [
  { name: 'AlphaFX Pro',   region: 'EU',    today: 312, conv: 14.2, delay: '1.2s', cap: 500,  used: 312, status: 'connected' },
  { name: 'TradingHub',    region: 'EU',    today: 287, conv: 11.8, delay: '0.9s', cap: 400,  used: 287, status: 'connected' },
  { name: 'CryptoLeads+',  region: 'APAC',  today: 198, conv:  9.4, delay: '2.1s', cap: 300,  used: 198, status: 'connected' },
  { name: 'ForexDirect',   region: 'MENA',  today: 174, conv: 16.3, delay: '1.4s', cap: 250,  used: 174, status: 'connected' },
  { name: 'BinaryWorld',   region: 'LATAM', today: 143, conv:  8.7, delay: '3.4s', cap: 200,  used: 143, status: 'connected' },
  { name: 'MarketPlus',    region: 'EU',    today:  89, conv: 12.1, delay: '1.8s', cap: 150,  used:  89, status: 'connected' },
  { name: 'ProSignals',    region: 'APAC',  today:   0, conv:  7.2, delay: '—',    cap: 100,  used:   0, status: 'error' },
  { name: 'TradeCore',     region: 'EU',    today:   0, conv:  0.0, delay: '—',    cap: 200,  used:   0, status: 'inactive' },
]

export default function BrokersPage() {
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="page-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Brokers</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            {BROKERS.filter(b => b.status === 'connected').length} connected · {BROKERS.length} total
          </p>
        </div>
        <button className="btn-primary" style={{ fontSize: 12, padding: '8px 18px' }} onClick={() => setShowModal(true)}>
          + Add Broker
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: 14, pointerEvents: 'none' }}>⌕</span>
          <input className="glass-input" style={{ paddingLeft: 34 }} placeholder="Search brokers…" />
        </div>
        <button className="btn-ghost">All Status ▾</button>
        <button className="btn-ghost">Region ▾</button>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="glass-table">
          <thead>
            <tr>
              <th>Broker</th><th>Region</th><th>Today</th>
              <th>Conv%</th><th>Avg Delay</th><th>Cap Used</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {BROKERS.map(b => (
              <tr key={b.name}>
                <td className="td-primary" style={{ fontWeight: 600 }}>{b.name}</td>
                <td>
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', color: 'var(--text-2)' }}>
                    {b.region}
                  </span>
                </td>
                <td style={{ fontWeight: 600, color: 'var(--text-1)' }}>{b.today}</td>
                <td style={{ fontWeight: 600, color: b.conv > 12 ? '#34d399' : '#fbbf24' }}>{b.conv}%</td>
                <td>{b.delay}</td>
                <td>
                  <div style={{ minWidth: 100 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-3)' }}>{b.used}/{b.cap}</span>
                      <span style={{ color: 'var(--text-2)' }}>{b.cap ? Math.round(b.used/b.cap*100) : 0}%</span>
                    </div>
                    <div className="score-track">
                      <div className="score-fill" style={{
                        width: `${b.cap ? b.used/b.cap*100 : 0}%`,
                        background: b.used/b.cap > 0.9 ? 'var(--grad-rose)'
                                  : b.used/b.cap > 0.7 ? 'linear-gradient(135deg,#fbbf24,#f59e0b)'
                                  : 'var(--grad-blue)',
                      }} />
                    </div>
                  </div>
                </td>
                <td><span className={`status-badge ${b.status}`}>{b.status}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-ghost">Edit</button>
                    <button className="btn-ghost">⚙</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-1)' }}>Add Broker Integration</h2>
                <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3 }}>Connect a new broker to the routing engine</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--glass-med)', border: '1px solid var(--glass-border)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            {[
              { label: 'Broker Name', ph: 'e.g. Binolla Markets' },
              { label: 'API Endpoint', ph: 'https://broker.example.com/api/v2/leads' },
              { label: 'API Key', ph: 'sk-…' },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', marginBottom: 7 }}>{f.label}</label>
                <input type="text" placeholder={f.ph} className="glass-input" />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', marginBottom: 7 }}>Region</label>
                <input type="text" placeholder="EU / APAC / LATAM" className="glass-input" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', marginBottom: 7 }}>Daily Cap</label>
                <input type="number" placeholder="500" className="glass-input" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-glass" style={{ fontSize: 12 }}>Test Connection</button>
              <button className="btn-primary" style={{ fontSize: 12 }}>Add Broker</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
