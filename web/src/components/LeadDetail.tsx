import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import clsx from 'clsx'
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
  user_agent?: string
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

interface LeadDetailProps {
  leadId: string
  onClose: () => void
}

function FraudVerificationCard({ checks, score }: { checks: FraudCheck[]; score?: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">Fraud Verification</h4>
        {score !== undefined && (
          <span
            className={clsx(
              'text-sm font-bold px-2 py-0.5 rounded',
              score >= 80
                ? 'bg-green-100 text-green-700'
                : score >= 50
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
            )}
          >
            Score: {score}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {checks.map((check, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0"
          >
            <div className="flex items-center gap-2">
              <span
                className={clsx(
                  'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold',
                  check.passed
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                )}
              >
                {check.passed ? '\u2713' : '\u2717'}
              </span>
              <span className="text-gray-700">{check.check}</span>
            </div>
            {check.score !== undefined && (
              <span className="text-gray-500 text-xs">{check.score}%</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function EventTimeline({ events }: { events: LeadEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-gray-500">No events recorded yet.</p>
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div
          key={event.id}
          className="flex gap-3 text-sm border-l-2 border-gray-200 pl-4 py-1"
        >
          <div className="flex-1">
            <span className="font-medium text-gray-900">{event.event_type}</span>
            {event.payload && Object.keys(event.payload).length > 0 && (
              <p className="text-gray-500 text-xs mt-0.5">
                {JSON.stringify(event.payload)}
              </p>
            )}
          </div>
          <time className="text-gray-400 text-xs whitespace-nowrap">
            {format(new Date(event.created_at), 'MMM d, HH:mm:ss')}
          </time>
        </div>
      ))}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between py-1.5 text-sm border-b border-gray-100">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  )
}

export default function LeadDetail({ leadId, onClose }: LeadDetailProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => api.get<LeadDetailResponse>(`/leads/${leadId}`),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
          <h3 className="text-lg font-semibold text-gray-900">Lead Details</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
              {error instanceof Error ? error.message : 'Failed to load lead details'}
            </div>
          )}

          {data && (
            <>
              {/* Identity */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h4 className="text-base font-semibold text-gray-900">
                    {data.lead.first_name} {data.lead.last_name}
                  </h4>
                  <StatusBadge status={data.lead.status} />
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-0">
                  <DetailRow label="ID" value={data.lead.id} />
                  <DetailRow label="Email" value={data.lead.email} />
                  <DetailRow label="Phone" value={data.lead.phone} />
                  <DetailRow label="Country" value={data.lead.country} />
                  <DetailRow label="IP Address" value={data.lead.ip_address} />
                  <DetailRow label="Affiliate" value={data.lead.affiliate_id} />
                  <DetailRow label="Broker" value={data.lead.broker_id} />
                  <DetailRow label="Funnel" value={data.lead.funnel_id} />
                  <DetailRow label="Offer" value={data.lead.offer_id} />
                  <DetailRow label="Click ID" value={data.lead.click_id} />
                  <DetailRow
                    label="Created"
                    value={format(new Date(data.lead.created_at), 'MMM d, yyyy HH:mm:ss')}
                  />
                  <DetailRow
                    label="Updated"
                    value={format(new Date(data.lead.updated_at), 'MMM d, yyyy HH:mm:ss')}
                  />
                </div>
              </div>

              {/* Fraud Verification */}
              {data.lead.fraud_checks && data.lead.fraud_checks.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Fraud Analysis</h4>
                  <FraudVerificationCard
                    checks={data.lead.fraud_checks}
                    score={data.lead.fraud_score}
                  />
                </div>
              )}

              {/* Event Timeline */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Event History</h4>
                <EventTimeline events={data.events || []} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
