import { useState } from 'react'

interface Affiliate {
  name: string
  cap: number
  used: number
  leads30: number
  conv: number
  rev: string
  status: 'active' | 'inactive'
}

const INITIAL_AFFILIATES: Affiliate[] = [
  { name: 'MediaBuyers Pro', cap: 300, used: 287, leads30: 6421, conv: 12.4, rev: '$18,420', status: 'active' },
  { name: 'CryptoAds LLC', cap: 200, used: 174, leads30: 4230, conv: 9.8, rev: '$12,310', status: 'active' },
  { name: 'FXPartners', cap: 150, used: 143, leads30: 3112, conv: 14.1, rev: '$9,880', status: 'active' },
  { name: 'LeadFactory', cap: 100, used: 89, leads30: 2890, conv: 11.2, rev: '$7,641', status: 'active' },
  { name: 'TrafficMasters', cap: 250, used: 198, leads30: 5310, conv: 8.3, rev: '$14,210', status: 'active' },
  { name: 'DigitalPulse', cap: 80, used: 44, leads30: 1240, conv: 6.1, rev: '$3,120', status: 'active' },
  { name: 'AffNet Global', cap: 200, used: 156, leads30: 4100, conv: 10.4, rev: '$11,040', status: 'active' },
  { name: 'CashFlow Ads', cap: 120, used: 91, leads30: 2460, conv: 9.7, rev: '$6,210', status: 'active' },
  { name: 'PushMasters', cap: 50, used: 12, leads30: 320, conv: 4.2, rev: '$980', status: 'inactive' },
  { name: 'GlobalReach', cap: 300, used: 0, leads30: 0, conv: 0.0, rev: '$0', status: 'inactive' },
]

const INITIAL_FORM = {
  name: '',
  managerEmail: '',
  cap: 150,
  postbackUrl: '',
  status: 'active' as Affiliate['status'],
}

export default function AffiliatesPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>(INITIAL_AFFILIATES)
  const [showCreate, setShowCreate] = useState(false)
  const [createSuccess, setCreateSuccess] = useState('')
  const [form, setForm] = useState(INITIAL_FORM)

  return (
    <div className="page-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Affiliates</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            {affiliates.filter((a) => a.status === 'active').length} active · {affiliates.length} total
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
          + Add Affiliate
        </button>
      </div>

      {createSuccess && (
        <div className="form-alert form-alert-success" style={{ marginBottom: 16 }}>
          {createSuccess}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: 14, pointerEvents: 'none' }}>⌕</span>
          <input className="glass-input" style={{ paddingLeft: 34 }} placeholder="Search affiliates…" />
        </div>
        <button className="btn-ghost">Sort by ▾</button>
        <button className="btn-ghost">Status ▾</button>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="glass-table">
          <thead>
            <tr>
              <th>Affiliate</th><th>Daily Cap</th><th>Used Today</th>
              <th>Leads (30d)</th><th>Conv%</th><th>Revenue</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {affiliates.map((a) => {
              const pct = a.cap ? a.used / a.cap : 0
              return (
                <tr key={a.name}>
                  <td className="td-primary" style={{ fontWeight: 600 }}>{a.name}</td>
                  <td style={{ color: 'var(--text-2)' }}>{a.cap}/day</td>
                  <td>
                    <span style={{ fontWeight: 600, color: pct > 0.9 ? '#f87171' : pct > 0.7 ? '#fbbf24' : '#34d399' }}>
                      {a.used}
                    </span>
                    <span style={{ color: 'var(--text-3)', fontSize: 11 }}> / {a.cap}</span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-1)' }}>{a.leads30.toLocaleString()}</td>
                  <td style={{ fontWeight: 600, color: a.conv > 10 ? '#34d399' : '#fbbf24' }}>{a.conv}%</td>
                  <td style={{ fontWeight: 600, color: '#34d399' }}>{a.rev}</td>
                  <td><span className={`status-badge ${a.status === 'active' ? 'delivered' : 'invalid'}`}>{a.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-ghost">Edit</button>
                      <button className="btn-ghost">Keys</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <form
            className="modal-box"
            style={{ maxWidth: 720 }}
            onSubmit={(e) => {
              e.preventDefault()

              const affiliate: Affiliate = {
                name: form.name.trim(),
                cap: form.cap,
                used: 0,
                leads30: 0,
                conv: 0,
                rev: '$0',
                status: form.status,
              }

              setAffiliates((prev) => [affiliate, ...prev])
              setCreateSuccess(`Affiliate “${affiliate.name}” created in workspace preview.`)
              setForm(INITIAL_FORM)
              setShowCreate(false)
            }}
          >
            <div className="form-header">
              <div>
                <div className="form-title">Add Affiliate</div>
                <div className="form-subtitle">Create a partner profile with cap and postback endpoint.</div>
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
                <label className="form-label" htmlFor="aff-name">Affiliate Name</label>
                <input
                  id="aff-name"
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Traffic Foundry"
                  required
                  autoFocus
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="aff-email">Manager Email</label>
                <input
                  id="aff-email"
                  type="email"
                  className="form-control"
                  value={form.managerEmail}
                  onChange={(e) => setForm((prev) => ({ ...prev, managerEmail: e.target.value }))}
                  placeholder="owner@affiliate.com"
                  required
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="aff-cap">Daily Cap</label>
                <input
                  id="aff-cap"
                  type="number"
                  min={1}
                  className="form-control"
                  value={form.cap}
                  onChange={(e) => setForm((prev) => ({ ...prev, cap: Math.max(1, Number(e.target.value) || 1) }))}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="aff-status">Status</label>
                <select
                  id="aff-status"
                  className="form-control"
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as Affiliate['status'] }))}
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>

              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" htmlFor="aff-postback">Postback URL</label>
                <input
                  id="aff-postback"
                  className="form-control"
                  value={form.postbackUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, postbackUrl: e.target.value }))}
                  placeholder="https://partner.example.com/postback"
                />
                <div className="form-help">Optional. Used for conversion and status callbacks.</div>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={!form.name.trim() || !form.managerEmail.trim()}>
                Add Affiliate
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
