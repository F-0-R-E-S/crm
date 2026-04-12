import { useNavigate } from 'react-router-dom'

export default function AffiliatesPage() {
  const navigate = useNavigate()

  return (
    <div className="page-section">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Affiliates</h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
          Frontend mocks removed. This screen is waiting for a real affiliates API on the current backend stack.
        </p>
      </div>

      <div className="glass-card" style={{ maxWidth: 920 }}>
        <div className="section-label">Why This Is Read-Only</div>
        <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.6 }}>
          The previous page used local preview data and client-only create actions. Those mocks were removed.
          The affiliates handlers available in this repository do not match the active runtime schema used by the current services,
          so exposing fake CRUD here would be misleading.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Removed
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 600 }}>Local affiliate list and preview create flow</div>
          </div>

          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Needed Next
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 600 }}>Runtime-safe affiliates list/create/update endpoints</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn-primary" style={{ fontSize: 12, padding: '8px 16px' }} onClick={() => navigate('/settings')}>
            Open Settings
          </button>
          <button className="btn-ghost" style={{ fontSize: 12, padding: '8px 16px' }} onClick={() => navigate('/leads')}>
            View Leads
          </button>
          <button className="btn-ghost" style={{ fontSize: 12, padding: '8px 16px' }} onClick={() => navigate('/routing')}>
            Open Routing
          </button>
        </div>
      </div>
    </div>
  )
}
