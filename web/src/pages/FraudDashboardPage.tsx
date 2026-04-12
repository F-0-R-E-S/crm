import { useState, useEffect } from 'react'
import { api } from '../lib/api'

interface FraudDashboardStats {
  total_checked: number
  total_flagged: number
  total_rejected: number
  total_approved: number
  avg_score: number
  score_distribution: {
    '0-20': number
    '21-40': number
    '41-60': number
    '61-80': number
    '81-100': number
  }
  detection_counts: {
    vpn: number
    tor: number
    proxy: number
    bot: number
    voip: number
  }
}

interface ShaveEvent {
  id: string
  lead_id: string
  broker_id: string
  old_status: string
  new_status: string
  raw_status: string
  detected_at: string
  acknowledged: boolean
}

interface ShavesResponse {
  data: ShaveEvent[]
  total: number
}

const SCORE_COLORS: Record<string, string> = {
  '0-20': '#34d399',
  '21-40': '#fbbf24',
  '41-60': '#f97316',
  '61-80': '#f87171',
  '81-100': '#991b1b',
}

export default function FraudDashboardPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [stats, setStats] = useState<FraudDashboardStats | null>(null)
  const [shaves, setShaves] = useState<ShaveEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get<FraudDashboardStats>(`/fraud/dashboard?from=${from}T00:00:00Z&to=${to}T23:59:59Z`),
      api.get<ShavesResponse>('/fraud/shaves?limit=10'),
    ])
      .then(([dashData, shaveData]) => {
        setStats(dashData)
        setShaves(shaveData.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [from, to])

  const maxDistribution = stats
    ? Math.max(...Object.values(stats.score_distribution), 1)
    : 1

  return (
    <div className="page-section">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Fraud Dashboard</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>Real-time fraud detection overview</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-light)',
              color: 'var(--text-1)',
              fontSize: 13,
              outline: 'none',
            }}
          />
          <span style={{ color: 'var(--text-3)', fontSize: 12 }}>to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-light)',
              color: 'var(--text-1)',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)', fontSize: 14 }}>
          Loading fraud data...
        </div>
      )}

      {!loading && stats && (
        <>
          {/* Stats cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total Checked', value: stats.total_checked.toLocaleString() },
              { label: 'Total Flagged', value: stats.total_flagged.toLocaleString() },
              { label: 'Total Rejected', value: stats.total_rejected.toLocaleString() },
              { label: 'Total Approved', value: stats.total_approved.toLocaleString() },
              { label: 'Avg Score', value: stats.avg_score.toFixed(1) },
            ].map((card) => (
              <div
                key={card.label}
                style={{
                  background: 'var(--glass-light)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 16,
                  padding: '16px 20px',
                  flex: 1,
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>{card.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)' }}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* Score Distribution */}
          <div
            style={{
              background: 'var(--glass-light)',
              backdropFilter: 'var(--blur-md)',
              WebkitBackdropFilter: 'var(--blur-md)',
              border: '1px solid var(--glass-border)',
              borderRadius: 20,
              padding: '24px',
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 16 }}>Score Distribution</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 140 }}>
              {Object.entries(stats.score_distribution).map(([range, count]) => (
                <div key={range} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)' }}>{count}</div>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 60,
                      height: `${(count / maxDistribution) * 100}px`,
                      minHeight: 4,
                      background: SCORE_COLORS[range],
                      borderRadius: 6,
                      transition: 'height 0.3s ease',
                    }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{range}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Detection Counts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'VPN', value: stats.detection_counts.vpn, icon: '🛡' },
              { label: 'TOR', value: stats.detection_counts.tor, icon: '🧅' },
              { label: 'Proxy', value: stats.detection_counts.proxy, icon: '🔀' },
              { label: 'Bot', value: stats.detection_counts.bot, icon: '🤖' },
              { label: 'VOIP', value: stats.detection_counts.voip, icon: '📞' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: 'var(--glass-light)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 16,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 22 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>{item.value.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Shave Events */}
          <div
            style={{
              background: 'var(--glass-light)',
              backdropFilter: 'var(--blur-md)',
              WebkitBackdropFilter: 'var(--blur-md)',
              border: '1px solid var(--glass-border)',
              borderRadius: 20,
              padding: '24px',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Recent Shave Events</div>
              <a
                href="/fraud/shave-detection"
                style={{ fontSize: 12, color: '#4facfe', textDecoration: 'none', fontWeight: 500 }}
              >
                View All →
              </a>
            </div>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Lead ID</th>
                  <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Broker</th>
                  <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Old Status</th>
                  <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>New Status</th>
                  <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Detected</th>
                  <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {shaves.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '30px 12px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                      No shave events detected
                    </td>
                  </tr>
                )}
                {shaves.map((ev) => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-2)', fontFamily: 'monospace' }}>{ev.lead_id.slice(0, 8)}...</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-2)' }}>{ev.broker_id.slice(0, 8)}...</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-2)' }}>{ev.old_status}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: '#f87171', fontWeight: 500 }}>{ev.new_status}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-2)' }}>{new Date(ev.detected_at).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          background: ev.acknowledged ? 'rgba(52,211,153,0.14)' : 'rgba(251,191,36,0.14)',
                          color: ev.acknowledged ? '#34d399' : '#fbbf24',
                        }}
                      >
                        {ev.acknowledged ? 'Acknowledged' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
