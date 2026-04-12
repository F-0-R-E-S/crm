import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { api } from '../lib/api'
import StatusBadge from './StatusBadge'

interface LeadEvent {
  id: string
  event_type: string
  payload?: Record<string, unknown>
  created_at: string
}

interface FraudCheck {
  check: string
  passed: boolean
  score?: number
  details?: string
}

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  country: string
  status: string
  affiliate_id: string
  broker_id?: string
  fraud_score?: number
  fraud_checks?: FraudCheck[]
  ip_address?: string
  funnel_id?: string
  offer_id?: string
  click_id?: string
  created_at: string
  updated_at: string
}

interface LeadDetailResponse {
  lead: Lead
  events: LeadEvent[]
}

function fraudColor(s: number) {
  return s >= 70 ? '#34d399' : s >= 50 ? '#fbbf24' : '#f87171'
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.9)', wordBreak: 'break-all' }}>{value}</div>
    </div>
  )
}

const TL_COLORS: Record<string, { bg: string; border: string }> = {
  lead_intake:   { bg: 'rgba(79,172,254,0.15)',  border: 'rgba(79,172,254,0.4)' },
  fraud_check:   { bg: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.4)' },
  routing:       { bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.4)' },
  broker_sent:   { bg: 'rgba(52,211,153,0.15)',  border: 'rgba(52,211,153,0.4)' },
  status_update: { bg: 'rgba(34,211,238,0.15)',  border: 'rgba(34,211,238,0.4)' },
  default:       { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.15)' },
}

const TL_ICONS: Record<string, string> = {
  lead_intake: '📥', fraud_check: '🛡', routing: '⇄',
  broker_sent: '📤', status_update: '🔄', default: '●',
}

export default function LeadDetail({ leadId, onClose }: { leadId: string; onClose: () => void }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => api.get<LeadDetailResponse>(`/leads/${leadId}`),
  })

  return (
    <div
      className="modal-backdrop"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            {data ? (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3, color: 'rgba(255,255,255,0.95)' }}>
                  {data.lead.first_name} {data.lead.last_name}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                    {data.lead.id.slice(0, 12)}…
                  </span>
                  <StatusBadge status={data.lead.status} />
                </div>
              </>
            ) : (
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>Lead Detail</h2>
            )}
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.60)', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}>✕</button>
        </div>

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(79,172,254,0.2)', borderTopColor: '#4facfe', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.22)', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#f87171' }}>
            {error instanceof Error ? error.message : 'Failed to load lead details'}
          </div>
        )}

        {data && (
          <>
            {/* Identity + Fraud 2-col */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              {/* Identity */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'rgba(255,255,255,0.35)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Identity
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  <InfoRow label="Email"      value={data.lead.email} />
                  <InfoRow label="Phone"      value={data.lead.phone} />
                  <InfoRow label="Country"    value={data.lead.country} />
                  <InfoRow label="IP Address" value={data.lead.ip_address} />
                  <InfoRow label="Affiliate"  value={data.lead.affiliate_id} />
                  <InfoRow label="Broker"     value={data.lead.broker_id} />
                  <InfoRow label="Offer"      value={data.lead.offer_id} />
                  <InfoRow label="Funnel"     value={data.lead.funnel_id} />
                  <InfoRow label="Click ID"   value={data.lead.click_id} />
                  <InfoRow label="Created"    value={format(new Date(data.lead.created_at), 'MMM d, HH:mm')} />
                </div>
              </div>

              {/* Fraud */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'rgba(255,255,255,0.35)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Fraud Analysis
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                </div>

                {data.lead.fraud_score != null && (
                  <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1, color: fraudColor(data.lead.fraud_score) }}>
                      {data.lead.fraud_score}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: fraudColor(data.lead.fraud_score) }}>
                        {data.lead.fraud_score >= 70 ? 'Clean' : data.lead.fraud_score >= 50 ? 'Suspicious' : 'High Risk'}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Fraud Score</div>
                    </div>
                  </div>
                )}

                {data.lead.fraud_checks && data.lead.fraud_checks.map((c, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: 10, marginBottom: 6,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: '50%', fontSize: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                        background: c.passed ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)',
                        color: c.passed ? '#34d399' : '#f87171',
                      }}>
                        {c.passed ? '✓' : '✕'}
                      </span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{c.check}</span>
                    </div>
                    {c.score != null && (
                      <span style={{ fontSize: 12, fontWeight: 600, color: fraudColor(c.score) }}>{c.score}</span>
                    )}
                  </div>
                ))}

                {(!data.lead.fraud_checks || data.lead.fraud_checks.length === 0) && (
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No fraud checks recorded.</p>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'rgba(255,255,255,0.35)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                Event Timeline
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              </div>

              {(data.events?.length ?? 0) === 0 ? (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No events recorded yet.</p>
              ) : (
                <div>
                  {data.events.map((ev, i) => {
                    const type = ev.event_type.toLowerCase().replace(' ', '_')
                    const colors = TL_COLORS[type] ?? TL_COLORS.default
                    const icon   = TL_ICONS[type]  ?? TL_ICONS.default
                    return (
                      <div key={ev.id} style={{ display: 'flex', gap: 14, padding: '10px 0', position: 'relative' }}>
                        {i < data.events.length - 1 && (
                          <div style={{ position: 'absolute', left: 11, top: 32, bottom: 0, width: 1, background: 'rgba(255,255,255,0.07)' }} />
                        )}
                        <div style={{
                          width: 23, height: 23, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, marginTop: 2,
                          background: colors.bg, border: `1px solid ${colors.border}`,
                        }}>{icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                            {ev.event_type}
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                            {format(new Date(ev.created_at), 'MMM d, HH:mm:ss')}
                          </div>
                          {ev.payload && Object.keys(ev.payload).length > 0 && (
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 3, fontFamily: 'monospace' }}>
                              {JSON.stringify(ev.payload).slice(0, 80)}…
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
