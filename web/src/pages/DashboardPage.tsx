import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import StatusBadge from '../components/StatusBadge'

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  country: string
  status: string
  fraud_score?: number
  created_at: string
}

interface LeadsResponse {
  leads: Lead[]
  total: number
  limit: number
  offset: number
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-leads'],
    queryFn: () => api.get<LeadsResponse>('/leads?limit=5&offset=0'),
  })

  const total = data?.total ?? 0
  const leads = data?.leads ?? []

  const delivered = leads.filter((l) => l.status === 'delivered').length
  const newLeads = leads.filter((l) => l.status === 'new').length

  const stats = [
    { label: 'Total Leads', value: total.toString(), description: 'All time' },
    { label: 'Recent New', value: newLeads.toString(), description: 'Latest batch' },
    { label: 'Recent Delivered', value: delivered.toString(), description: 'Latest batch' },
    {
      label: 'Avg Fraud Score',
      value:
        leads.length > 0
          ? Math.round(
              leads.reduce((acc, l) => acc + (l.fraud_score ?? 0), 0) / leads.length
            ).toString()
          : '--',
      description: 'Latest batch',
    },
  ]

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="text-sm text-gray-500">{stat.label}</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">
              {isLoading ? (
                <div className="h-9 w-16 bg-gray-200 animate-pulse rounded" />
              ) : (
                stat.value
              )}
            </div>
            <div className="text-sm text-gray-400 mt-1">{stat.description}</div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Leads</h3>
          <button
            onClick={() => navigate('/leads')}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            View all
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error instanceof Error ? error.message : 'Failed to load leads'}
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
                <div className="h-4 w-48 bg-gray-200 animate-pulse rounded" />
                <div className="h-4 w-20 bg-gray-200 animate-pulse rounded" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && leads.length === 0 && (
          <p className="text-gray-500 text-sm py-4">
            No leads yet. Send your first lead via the API.
          </p>
        )}

        {!isLoading && leads.length > 0 && (
          <div className="divide-y divide-gray-100">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded cursor-pointer transition-colors"
                onClick={() => navigate('/leads')}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {lead.first_name?.[0]?.toUpperCase() || '?'}
                    {lead.last_name?.[0]?.toUpperCase() || ''}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {lead.first_name} {lead.last_name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{lead.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-gray-400">
                    {lead.country}
                  </span>
                  <StatusBadge status={lead.status} />
                  <span className="text-xs text-gray-400">
                    {format(new Date(lead.created_at), 'MMM d, HH:mm')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
