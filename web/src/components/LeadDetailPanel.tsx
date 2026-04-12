import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { api } from '../lib/api'
import StatusBadge from './StatusBadge'
import QualityBadge from './QualityBadge'
import type { LeadDetailResponse, LeadComment, LeadRegistration, LeadEvent } from '../types/leads'

const TABS = ['Main', 'Autologin', 'Registrations', 'Events', 'Comments'] as const
type Tab = typeof TABS[number]

function fraudColor(s: number) {
  return s >= 70 ? '#34d399' : s >= 50 ? '#fbbf24' : '#f87171'
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.9)', wordBreak: 'break-all' }}>{String(value)}</div>
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

function RegistrationRow({ reg }: { reg: LeadRegistration }) {
  const [expanded, setExpanded] = useState(false)
  const resultColor = reg.result === 'success' ? '#34d399' : reg.result === 'timeout' ? '#fbbf24' : '#f87171'
  return (
    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: resultColor }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{reg.broker_name}</span>
          <span style={{ fontSize: 11, color: resultColor, fontWeight: 600, textTransform: 'capitalize' }}>{reg.result}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{reg.response_time_ms}ms</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{format(new Date(reg.created_at), 'MMM d, HH:mm:ss')}</span>
        </div>
      </div>
      {reg.rejection_reason && (
        <div style={{ fontSize: 11, color: '#f87171', marginTop: 4, paddingLeft: 16 }}>{reg.rejection_reason}</div>
      )}
      {reg.raw_response && (
        <>
          <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 10, cursor: 'pointer', marginTop: 4, padding: 0 }}>
            {expanded ? '▾ Hide response' : '▸ Show response'}
          </button>
          {expanded && (
            <pre style={{ fontSize: 10, color: 'var(--text-3)', background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: 8, marginTop: 4, overflow: 'auto', maxHeight: 120 }}>
              {JSON.stringify(reg.raw_response, null, 2)}
            </pre>
          )}
        </>
      )}
    </div>
  )
}

function CommentThread({ comments, leadId }: { comments: LeadComment[]; leadId: string }) {
  const queryClient = useQueryClient()
  const [text, setText] = useState('')

  const addComment = useMutation({
    mutationFn: (content: string) => api.post(`/leads/${leadId}/comments`, { content }),
    onSuccess: () => {
      setText('')
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
    },
  })

  return (
    <div>
      {comments.length === 0 && (
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>No comments yet.</p>
      )}
      {comments.map(c => (
        <div key={c.id} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{c.user_name}</span>
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{format(new Date(c.created_at), 'MMM d, HH:mm')}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{c.content}</div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input
          className="glass-input"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add a comment..."
          style={{ flex: 1, fontSize: 12, padding: '8px 12px' }}
          onKeyDown={e => { if (e.key === 'Enter' && text.trim()) addComment.mutate(text.trim()) }}
          maxLength={1000}
        />
        <button className="btn-primary" style={{ fontSize: 11, padding: '7px 14px' }} onClick={() => text.trim() && addComment.mutate(text.trim())} disabled={!text.trim() || addComment.isPending}>
          Send
        </button>
      </div>
    </div>
  )
}

export default function LeadDetailPanel({ leadId, onClose }: { leadId: string; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('Main')

  const { data, isLoading, error } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => api.get<LeadDetailResponse>(`/leads/${leadId}`),
  })

  const lead = data?.lead
  const events = data?.events ?? []
  const registrations = data?.registrations ?? []
  const comments = data?.comments ?? []

  const regSummary = registrations.length > 0
    ? { total: registrations.length, success: registrations.filter(r => r.result === 'success').length, rejected: registrations.filter(r => r.result === 'rejected').length }
    : null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        display: 'flex', justifyContent: 'flex-end',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

      {/* Panel */}
      <div style={{
        position: 'relative', width: '70%', maxWidth: 900,
        height: '100vh', overflow: 'auto',
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--glass-border)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.3)',
        animation: 'slideInRight 0.25s ease-out',
      }}>
        {/* Header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-surface)', borderBottom: '1px solid var(--glass-border)', padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              {lead ? (
                <>
                  <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3, color: 'var(--text-1)' }}>
                    {lead.first_name} {lead.last_name}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>{lead.id.slice(0, 12)}...</span>
                    <StatusBadge status={lead.status} />
                    {lead.quality_score != null && <QualityBadge score={lead.quality_score} />}
                  </div>
                </>
              ) : (
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>Lead Detail</h2>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {lead && (
                <>
                  <button className="btn-glass" style={{ fontSize: 11, padding: '5px 10px' }}>↻ Resend</button>
                  <button className="btn-glass" style={{ fontSize: 11, padding: '5px 10px' }}>⊘ Block</button>
                </>
              )}
              <button onClick={onClose} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.60)', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
              }}>✕</button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--glass-border)', margin: '0 -24px', padding: '0 24px' }}>
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '8px 16px', fontSize: 12, fontWeight: tab === t ? 600 : 400,
                  color: tab === t ? '#4facfe' : 'var(--text-2)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: tab === t ? '2px solid #4facfe' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {t}
                {t === 'Events' && events.length > 0 && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--text-3)' }}>({events.length})</span>}
                {t === 'Comments' && comments.length > 0 && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--text-3)' }}>({comments.length})</span>}
                {t === 'Registrations' && registrations.length > 0 && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--text-3)' }}>({registrations.length})</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px' }}>
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

          {lead && tab === 'Main' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Identity */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'rgba(255,255,255,0.35)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Identity <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  <InfoRow label="Email" value={lead.email} />
                  <InfoRow label="Phone" value={lead.phone} />
                  <InfoRow label="Country" value={lead.country} />
                  <InfoRow label="City" value={lead.city} />
                  <InfoRow label="IP Address" value={lead.ip_address} />
                  <InfoRow label="Language" value={lead.language} />
                  <InfoRow label="Created" value={format(new Date(lead.created_at), 'MMM d, HH:mm')} />
                  <InfoRow label="Updated" value={format(new Date(lead.updated_at), 'MMM d, HH:mm')} />
                </div>

                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'rgba(255,255,255,0.35)', marginBottom: 14, marginTop: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Traffic <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  <InfoRow label="Affiliate" value={lead.affiliate_name ?? lead.affiliate_id} />
                  <InfoRow label="Broker" value={lead.broker_name ?? lead.broker_id} />
                  <InfoRow label="Offer" value={lead.offer_id} />
                  <InfoRow label="Funnel" value={lead.funnel_name ?? lead.funnel_id} />
                  <InfoRow label="Click ID" value={lead.click_id} />
                  <InfoRow label="Source" value={lead.source} />
                  <InfoRow label="Campaign" value={lead.campaign} />
                  <InfoRow label="UTM Source" value={lead.utm_source} />
                  <InfoRow label="UTM Medium" value={lead.utm_medium} />
                  <InfoRow label="Landing" value={lead.landing_page} />
                </div>

                {lead.tags && lead.tags.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>Tags</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {lead.tags.map(t => (
                        <span key={t} style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(167,139,250,0.12)', fontSize: 11, color: '#a78bfa' }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Fraud & Quality */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'rgba(255,255,255,0.35)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Fraud Analysis <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                </div>

                {lead.fraud_score != null && (
                  <div style={{ marginBottom: 16, padding: '14px 18px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1, color: fraudColor(lead.fraud_score) }}>
                      {lead.fraud_score}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: fraudColor(lead.fraud_score) }}>
                        {lead.fraud_score >= 70 ? 'Clean' : lead.fraud_score >= 50 ? 'Suspicious' : 'High Risk'}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Fraud Score</div>
                    </div>
                  </div>
                )}

                {lead.fraud_checks?.map((c, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: 10, marginBottom: 4,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: '50%', fontSize: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                        background: c.passed ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)',
                        color: c.passed ? '#34d399' : '#f87171',
                      }}>{c.passed ? '✓' : '✕'}</span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{c.check}</span>
                    </div>
                    {c.score != null && (
                      <span style={{ fontSize: 12, fontWeight: 600, color: fraudColor(c.score) }}>{c.score}{c.max_score ? `/${c.max_score}` : ''}</span>
                    )}
                  </div>
                ))}

                {lead.rejection_reason && (
                  <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: '#f87171', marginBottom: 4 }}>Rejection Reason</div>
                    <div style={{ fontSize: 13, color: '#f87171' }}>{lead.rejection_reason}</div>
                  </div>
                )}

                {/* Finance */}
                {(lead.ftd_amount != null || lead.sale_status) && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'rgba(255,255,255,0.35)', marginBottom: 14, marginTop: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                      Finance <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                      <InfoRow label="Sale Status" value={lead.sale_status} />
                      <InfoRow label="FTD Amount" value={lead.ftd_amount != null ? `$${lead.ftd_amount.toLocaleString()}` : undefined} />
                      <InfoRow label="FTD Date" value={lead.ftd_at ? format(new Date(lead.ftd_at), 'MMM d, yyyy HH:mm') : undefined} />
                      <InfoRow label="Sent At" value={lead.sent_at ? format(new Date(lead.sent_at), 'MMM d, yyyy HH:mm') : undefined} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {lead && tab === 'Autologin' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'rgba(255,255,255,0.35)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                Autologin Pipeline <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                <InfoRow label="Autologin Status" value={lead.autologin_status ?? 'N/A'} />
                <InfoRow label="Autologin URL" value={lead.autologin_url} />
              </div>
              {!lead.autologin_status && (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 16 }}>Autologin not requested for this lead.</p>
              )}
            </div>
          )}

          {lead && tab === 'Registrations' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'rgba(255,255,255,0.35)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                Broker Delivery Attempts <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              </div>
              {regSummary && (
                <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', marginBottom: 12, fontSize: 12, color: 'var(--text-2)', display: 'flex', gap: 16 }}>
                  <span>Attempts: <b style={{ color: 'var(--text-1)' }}>{regSummary.total}</b></span>
                  <span>Successful: <b style={{ color: '#34d399' }}>{regSummary.success}</b></span>
                  <span>Rejected: <b style={{ color: '#f87171' }}>{regSummary.rejected}</b></span>
                </div>
              )}
              {registrations.length === 0 ? (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No delivery attempts recorded.</p>
              ) : (
                registrations.map(r => <RegistrationRow key={r.id} reg={r} />)
              )}
            </div>
          )}

          {lead && tab === 'Events' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'rgba(255,255,255,0.35)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                Event Timeline <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              </div>
              {events.length === 0 ? (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No events recorded yet.</p>
              ) : (
                events.map((ev: LeadEvent, i: number) => {
                  const type = ev.event_type.toLowerCase().replace(' ', '_')
                  const colors = TL_COLORS[type] ?? TL_COLORS.default
                  const icon = TL_ICONS[type] ?? TL_ICONS.default
                  return (
                    <div key={ev.id} style={{ display: 'flex', gap: 14, padding: '10px 0', position: 'relative' }}>
                      {i < events.length - 1 && (
                        <div style={{ position: 'absolute', left: 11, top: 32, bottom: 0, width: 1, background: 'rgba(255,255,255,0.07)' }} />
                      )}
                      <div style={{
                        width: 23, height: 23, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, marginTop: 2,
                        background: colors.bg, border: `1px solid ${colors.border}`,
                      }}>{icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>{ev.event_type}</div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{format(new Date(ev.created_at), 'MMM d, HH:mm:ss')}</span>
                          {ev.duration_ms != null && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{ev.duration_ms}ms</span>}
                          {ev.status_code != null && <span style={{ fontSize: 11, color: ev.status_code < 400 ? '#34d399' : '#f87171' }}>{ev.status_code}</span>}
                        </div>
                        {ev.error && <div style={{ fontSize: 11, color: '#f87171', marginTop: 3 }}>{ev.error}</div>}
                        {ev.payload && Object.keys(ev.payload).length > 0 && (
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 3, fontFamily: 'monospace' }}>
                            {JSON.stringify(ev.payload).slice(0, 120)}{JSON.stringify(ev.payload).length > 120 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {lead && tab === 'Comments' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'rgba(255,255,255,0.35)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                Comments <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              </div>
              <CommentThread comments={comments} leadId={leadId} />
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  )
}
