import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import clsx from 'clsx'
import { api } from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import LeadDetail from '../components/LeadDetail'

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  country: string
  status: string
  fraud_score?: number
  affiliate_id?: string
  created_at: string
}

interface LeadsResponse {
  leads: Lead[]
  total: number
  limit: number
  offset: number
}

const PAGE_SIZE = 20

export default function LeadsPage() {
  const [page, setPage] = useState(0)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['leads', page],
    queryFn: () =>
      api.get<LeadsResponse>(`/leads?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`),
    placeholderData: (prev) => prev,
  })

  const leads = data?.leads ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Leads</h2>
          {total > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {total} lead{total !== 1 ? 's' : ''} total
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search leads..."
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
          />
          <button className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700">
            Export
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-4">
          {error instanceof Error ? error.message : 'Failed to load leads'}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Loading bar */}
        {isFetching && (
          <div className="h-0.5 bg-brand-100">
            <div className="h-full bg-brand-500 animate-pulse w-full" />
          </div>
        )}

        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Country
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Score
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 animate-pulse rounded w-20" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading && leads.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No leads yet. Send your first lead via the API.
                </td>
              </tr>
            )}

            {leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => setSelectedLeadId(lead.id)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                  {lead.id.slice(0, 8)}...
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {lead.first_name} {lead.last_name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{lead.email}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{lead.country}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={lead.status} />
                </td>
                <td className="px-4 py-3 text-sm">
                  {lead.fraud_score !== undefined && lead.fraud_score !== null ? (
                    <span
                      className={clsx(
                        'font-medium',
                        lead.fraud_score >= 80
                          ? 'text-green-600'
                          : lead.fraud_score >= 50
                            ? 'text-yellow-600'
                            : 'text-red-600'
                      )}
                    >
                      {lead.fraud_score}
                    </span>
                  ) : (
                    <span className="text-gray-400">--</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {format(new Date(lead.created_at), 'MMM d, yyyy HH:mm')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-500">
              Showing {page * PAGE_SIZE + 1}--
              {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className={clsx(
                  'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                  page === 0
                    ? 'text-gray-300 border-gray-200 cursor-not-allowed'
                    : 'text-gray-600 border-gray-300 hover:bg-gray-100'
                )}
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className={clsx(
                  'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                  page >= totalPages - 1
                    ? 'text-gray-300 border-gray-200 cursor-not-allowed'
                    : 'text-gray-600 border-gray-300 hover:bg-gray-100'
                )}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lead Detail Modal */}
      {selectedLeadId && (
        <LeadDetail
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
        />
      )}
    </div>
  )
}
