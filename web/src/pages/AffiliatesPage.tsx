import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { usePermissions } from '../hooks/usePermissions'
import PermissionGate from '../components/PermissionGate'
import StatusBadge from '../components/StatusBadge'
import clsx from 'clsx'

interface Affiliate {
  id: string
  name: string
  email: string
  status: string
  daily_cap: number
  total_cap: number
  postback_url: string
  parent_id: string | null
  level: number
  manager_id: string | null
  created_at: string
}

interface AffiliateForm {
  name: string
  email: string
  status: string
  daily_cap: number
  total_cap: number
  postback_url: string
  postback_events: string[]
  parent_id: string
}

const emptyForm: AffiliateForm = {
  name: '', email: '', status: 'active', daily_cap: 0, total_cap: 0,
  postback_url: '', postback_events: ['delivered', 'ftd', 'rejected'], parent_id: '',
}

const POSTBACK_EVENTS = [
  'delivered', 'rejected', 'ftd', 'status_updated', 'fraud', 'shave_detected',
]

export default function AffiliatesPage() {
  const { has } = usePermissions()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<AffiliateForm>(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['affiliates'],
    queryFn: () => api.get<{ affiliates: Affiliate[]; total: number }>('/affiliates?limit=100'),
  })

  const saveMutation = useMutation({
    mutationFn: (data: AffiliateForm) =>
      editId ? api.put(`/affiliates/${editId}`, data) : api.post('/affiliates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliates'] })
      setShowForm(false)
      setEditId(null)
      setForm(emptyForm)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Save failed'),
  })

  function openEdit(aff: Affiliate) {
    setForm({
      name: aff.name, email: aff.email, status: aff.status,
      daily_cap: aff.daily_cap, total_cap: aff.total_cap,
      postback_url: aff.postback_url, postback_events: ['delivered', 'ftd', 'rejected'],
      parent_id: aff.parent_id || '',
    })
    setEditId(aff.id)
    setShowForm(true)
    setError('')
  }

  function openCreate() {
    setForm(emptyForm)
    setEditId(null)
    setShowForm(true)
    setError('')
  }

  function toggleEvent(event: string) {
    setForm((f) => ({
      ...f,
      postback_events: f.postback_events.includes(event)
        ? f.postback_events.filter((e) => e !== event)
        : [...f.postback_events, event],
    }))
  }

  const affiliates = data?.affiliates || []
  const topLevel = affiliates.filter((a) => !a.parent_id)
  const children = (parentId: string) => affiliates.filter((a) => a.parent_id === parentId)

  function renderRow(aff: Affiliate, indent: number) {
    return (
      <tr key={aff.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => has('affiliates:write') && openEdit(aff)}>
        <td className="px-4 py-3">
          <div className="flex items-center" style={{ paddingLeft: indent * 20 }}>
            {indent > 0 && <span className="text-gray-300 mr-2">&mdash;</span>}
            <div>
              <div className="text-sm font-medium text-gray-900">{aff.name}</div>
              <div className="text-xs text-gray-500">{aff.email}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3"><StatusBadge status={aff.status} /></td>
        <td className="px-4 py-3 text-sm text-gray-700">
          {aff.daily_cap > 0 ? (
            <span>{aff.daily_cap}/day</span>
          ) : (
            <span className="text-gray-400">No cap</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-[200px]">
          {aff.postback_url || <span className="text-gray-300">Not set</span>}
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">
          {new Date(aff.created_at).toLocaleDateString()}
        </td>
      </tr>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Affiliates</h2>
        <PermissionGate permission="affiliates:write">
          <button onClick={openCreate} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700">
            Add Affiliate
          </button>
        </PermissionGate>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editId ? 'Edit Affiliate' : 'New Affiliate'}
          </h3>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Daily Cap (0 = unlimited)</label>
              <input type="number" value={form.daily_cap} onChange={(e) => setForm({ ...form, daily_cap: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500" min={0} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Cap (0 = unlimited)</label>
              <input type="number" value={form.total_cap} onChange={(e) => setForm({ ...form, total_cap: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500" min={0} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Affiliate</label>
              <select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500">
                <option value="">None (top-level)</option>
                {affiliates.filter((a) => a.id !== editId).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Postback URL</label>
            <input type="url" value={form.postback_url} onChange={(e) => setForm({ ...form, postback_url: e.target.value })}
              placeholder="https://affiliate.com/postback"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500" />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Postback Events</label>
            <div className="flex flex-wrap gap-2">
              {POSTBACK_EVENTS.map((ev) => (
                <button key={ev} type="button" onClick={() => toggleEvent(ev)}
                  className={clsx(
                    'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                    form.postback_events.includes(ev)
                      ? 'bg-brand-50 border-brand-300 text-brand-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  )}>
                  {ev}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50">
              {saveMutation.isPending ? 'Saving...' : editId ? 'Update' : 'Create'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null) }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />)}
          </div>
        ) : affiliates.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No affiliates configured yet.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Affiliate</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Cap</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Postback</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topLevel.map((aff) => (
                <>
                  {renderRow(aff, 0)}
                  {children(aff.id).map((child) => renderRow(child, 1))}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
