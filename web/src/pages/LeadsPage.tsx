import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  phone_e164?: string
  country: string
  status: string
  quality_score?: number
  fraud_score?: number
  funnel_name?: string
  affiliate_id?: string
  aff_sub1?: string
  created_at: string
}

interface LeadsResponse {
  leads: Lead[]
  total: number
  limit: number
  offset: number
}

interface BulkImportResponse {
  total: number
  accepted: number
  rejected: number
  errors?: { row: number; field?: string; message: string }[]
}

const PAGE_SIZE = 20
const STATUSES = ['', 'new', 'processing', 'routed', 'delivered', 'rejected', 'fraud', 'duplicate']
const COUNTRIES = ['', 'US', 'GB', 'DE', 'FR', 'AU', 'CA', 'NL', 'ES', 'IT', 'BR', 'IN', 'TR', 'AE', 'IL', 'ZA', 'PL', 'UA', 'RU']

export default function LeadsPage() {
  const [page, setPage] = useState(0)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [showBulkImport, setShowBulkImport] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [appliedFilters, setAppliedFilters] = useState({ search: '', status: '', country: '', dateFrom: '', dateTo: '' })

  const queryClient = useQueryClient()

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams()
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(page * PAGE_SIZE))
    if (appliedFilters.search) params.set('search', appliedFilters.search)
    if (appliedFilters.status) params.set('status', appliedFilters.status)
    if (appliedFilters.country) params.set('country', appliedFilters.country)
    if (appliedFilters.dateFrom) params.set('date_from', new Date(appliedFilters.dateFrom).toISOString())
    if (appliedFilters.dateTo) params.set('date_to', new Date(appliedFilters.dateTo).toISOString())
    return params.toString()
  }, [page, appliedFilters])

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['leads', page, appliedFilters],
    queryFn: () => api.get<LeadsResponse>(`/leads?${buildQuery()}`),
    placeholderData: (prev) => prev,
  })

  const applyFilters = () => {
    setPage(0)
    setAppliedFilters({ search, status: statusFilter, country: countryFilter, dateFrom, dateTo })
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setCountryFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(0)
    setAppliedFilters({ search: '', status: '', country: '', dateFrom: '', dateTo: '' })
  }

  const hasFilters = appliedFilters.search || appliedFilters.status || appliedFilters.country || appliedFilters.dateFrom || appliedFilters.dateTo

  const leads = data?.leads ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Leads</h2>
          {total > 0 && (
            <p className="text-sm text-gray-500 mt-1">{total} lead{total !== 1 ? 's' : ''} total</p>
          )}
        </div>
        <button
          onClick={() => setShowBulkImport(true)}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700"
        >
          Bulk Import
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Search email, name, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Statuses</option>
            {STATUSES.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Countries</option>
            {COUNTRIES.filter(Boolean).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
            placeholder="From"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
              placeholder="To"
            />
            <button onClick={applyFilters} className="px-3 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700">
              Filter
            </button>
            {hasFilters && (
              <button onClick={clearFilters} className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-4">
          {error instanceof Error ? error.message : 'Failed to load leads'}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isFetching && (
          <div className="h-0.5 bg-brand-100">
            <div className="h-full bg-brand-500 animate-pulse w-full" />
          </div>
        )}

        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Funnel</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 8 }).map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 animate-pulse rounded w-20" /></td>
                ))}
              </tr>
            ))}
            {!isLoading && leads.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No leads found.</td></tr>
            )}
            {leads.map((lead) => (
              <tr key={lead.id} onClick={() => setSelectedLeadId(lead.id)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                <td className="px-4 py-3 text-sm text-gray-500 font-mono">{lead.id.slice(0, 8)}...</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{lead.first_name} {lead.last_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{lead.email}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{lead.country}</td>
                <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                <td className="px-4 py-3 text-sm">
                  {lead.quality_score != null ? (
                    <span className={clsx('font-medium', lead.quality_score >= 80 ? 'text-green-600' : lead.quality_score >= 50 ? 'text-yellow-600' : 'text-red-600')}>
                      {lead.quality_score}
                    </span>
                  ) : <span className="text-gray-400">--</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{lead.funnel_name || '--'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{format(new Date(lead.created_at), 'MMM d, HH:mm')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-500">
              Showing {page * PAGE_SIZE + 1}--{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                className={clsx('px-3 py-1.5 text-sm rounded-lg border', page === 0 ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-gray-600 border-gray-300 hover:bg-gray-100')}>
                Previous
              </button>
              <span className="text-sm text-gray-600">Page {page + 1} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className={clsx('px-3 py-1.5 text-sm rounded-lg border', page >= totalPages - 1 ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-gray-600 border-gray-300 hover:bg-gray-100')}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedLeadId && <LeadDetail leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />}
      {showBulkImport && <BulkImportModal onClose={() => { setShowBulkImport(false); queryClient.invalidateQueries({ queryKey: ['leads'] }) }} />}
    </div>
  )
}

function BulkImportModal({ onClose }: { onClose: () => void }) {
  const [jsonText, setJsonText] = useState('')
  const [result, setResult] = useState<BulkImportResponse | null>(null)

  const mutation = useMutation({
    mutationFn: (leads: object[]) => api.post<BulkImportResponse>('/leads/bulk', { leads }),
    onSuccess: (data) => setResult(data),
  })

  const handleSubmit = () => {
    try {
      const parsed = JSON.parse(jsonText)
      const leads = Array.isArray(parsed) ? parsed : parsed.leads
      if (!Array.isArray(leads) || leads.length === 0) {
        alert('Please provide a JSON array of leads')
        return
      }
      mutation.mutate(leads)
    } catch {
      alert('Invalid JSON format')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Bulk Import Leads</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="p-6">
          {result ? (
            <div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-700">{result.total}</div>
                  <div className="text-sm text-blue-600">Total</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-700">{result.accepted}</div>
                  <div className="text-sm text-green-600">Accepted</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-700">{result.rejected}</div>
                  <div className="text-sm text-red-600">Rejected</div>
                </div>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg max-h-40 overflow-auto">
                  {result.errors.map((e, i) => (
                    <div key={i} className="text-sm text-red-700">Row {e.row}: {e.message}{e.field ? ` (${e.field})` : ''}</div>
                  ))}
                </div>
              )}
              <button onClick={onClose} className="mt-4 w-full px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">Done</button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-3">
                Paste a JSON array of leads. Required fields: first_name, email, phone, country.
              </p>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={12}
                placeholder={`[\n  {"first_name":"John","last_name":"Doe","email":"john@example.com","phone":"+1234567890","country":"US"},\n  ...\n]`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-brand-500"
              />
              <button
                onClick={handleSubmit}
                disabled={mutation.isPending || !jsonText.trim()}
                className="mt-3 w-full px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                {mutation.isPending ? 'Importing...' : 'Import Leads'}
              </button>
              {mutation.isError && (
                <div className="mt-2 text-sm text-red-600">
                  {mutation.error instanceof Error ? mutation.error.message : 'Import failed'}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
