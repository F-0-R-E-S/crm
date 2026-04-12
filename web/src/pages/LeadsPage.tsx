import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { api } from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import QualityBadge from '../components/QualityBadge'
import LeadDetailPanel from '../components/LeadDetailPanel'
import FilterPanel from '../components/FilterPanel'
import ColumnPicker from '../components/ColumnPicker'
import ExportModal from '../components/ExportModal'
import BulkActionsBar from '../components/BulkActionsBar'
import PaginationBar from '../components/PaginationBar'
import {
  ALL_COLUMNS, DEFAULT_COLUMNS, DEFAULT_VIEWS,
  type Lead, type LeadsResponse, type LeadFilters, type SortConfig,
  type FilterPreset, type BulkImportResponse,
} from '../types/leads'

const PAGE_SIZES = [20, 50, 100, 200]

function fraudColor(score: number) {
  return score >= 70 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171'
}

function toStartOfDay(value: string) {
  return value ? new Date(`${value}T00:00:00`).toISOString() : ''
}
function toEndOfDay(value: string) {
  return value ? new Date(`${value}T23:59:59.999`).toISOString() : ''
}

function renderCell(lead: Lead, key: string): React.ReactNode {
  const val = (lead as unknown as Record<string, unknown>)[key]
  if (val == null || val === '') return <span style={{ color: 'var(--text-3)' }}>—</span>

  switch (key) {
    case 'id':
      return <span className="td-mono" style={{ color: 'var(--text-3)' }}>{String(val).slice(0, 8)}...</span>
    case 'status':
      return <StatusBadge status={String(val)} />
    case 'fraud_score':
      return <span style={{ fontWeight: 600, color: fraudColor(Number(val)) }}>{String(val)}</span>
    case 'quality_score':
      return <QualityBadge score={Number(val)} />
    case 'created_at':
    case 'updated_at':
    case 'sent_at':
    case 'ftd_at':
      return format(new Date(String(val)), 'MMM d, HH:mm')
    case 'ftd_amount':
      return <span style={{ fontWeight: 600, color: '#34d399' }}>${Number(val).toLocaleString()}</span>
    case 'tags':
      return Array.isArray(val)
        ? (val as string[]).map(t => <span key={t} style={{ padding: '1px 6px', borderRadius: 4, background: 'rgba(167,139,250,0.12)', fontSize: 10, color: '#a78bfa', marginRight: 3 }}>{t}</span>)
        : String(val)
    default:
      return String(val)
  }
}

export default function LeadsPage() {
  const queryClient = useQueryClient()

  // View system
  const [views] = useState(() => DEFAULT_VIEWS.map((v, i) => ({ ...v, id: `default-${i}`, created_at: new Date().toISOString() })))
  const [activeViewIdx, setActiveViewIdx] = useState(0)
  const activeView = views[activeViewIdx]

  // Table state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(activeView?.page_size ?? 50)
  const [columns, setColumns] = useState<string[]>(activeView?.columns ?? DEFAULT_COLUMNS)
  const [sort, setSort] = useState<SortConfig[]>(activeView?.sort ?? [{ field: 'created_at', direction: 'desc' }])
  const [filters, setFilters] = useState<LeadFilters>(activeView?.filters ?? {})
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [showColumns, setShowColumns] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [bulkPayload, setBulkPayload] = useState(JSON.stringify([{ first_name: 'John', last_name: 'Doe', email: 'john.doe@example.com', phone: '+14155552671', country: 'US' }], null, 2))
  const [bulkError, setBulkError] = useState('')
  const [bulkSuccess, setBulkSuccess] = useState('')
  const [presets] = useState<FilterPreset[]>([])

  const deferredSearch = useDeferredValue(search)

  const queryParams = useMemo(() => {
    const params = new URLSearchParams({
      limit: String(pageSize),
      offset: String((page - 1) * pageSize),
    })
    if (deferredSearch.trim()) params.set('search', deferredSearch.trim())
    if (filters.status?.length) params.set('status', filters.status.join(','))
    if (filters.country?.length) params.set('country', filters.country.join(','))
    if (filters.date_from) params.set('date_from', toStartOfDay(filters.date_from))
    if (filters.date_to) params.set('date_to', toEndOfDay(filters.date_to))
    if (filters.affiliate_id) params.set('affiliate_id', filters.affiliate_id)
    if (filters.broker_id) params.set('broker_id', filters.broker_id)
    if (filters.fraud_score_min != null) params.set('fraud_score_min', String(filters.fraud_score_min))
    if (filters.fraud_score_max != null) params.set('fraud_score_max', String(filters.fraud_score_max))
    if (filters.quality_score_min != null) params.set('quality_score_min', String(filters.quality_score_min))
    if (filters.quality_score_max != null) params.set('quality_score_max', String(filters.quality_score_max))
    if (filters.sale_status) params.set('sale_status', filters.sale_status)
    if (filters.source) params.set('source', filters.source)
    if (filters.ip) params.set('ip', filters.ip)
    if (filters.has_comment) params.set('has_comment', 'true')
    if (sort.length > 0) params.set('sort', sort.map(s => `${s.field}:${s.direction}`).join(','))
    return params.toString()
  }, [page, pageSize, deferredSearch, filters, sort])

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['leads', queryParams],
    queryFn: () => api.get<LeadsResponse>(`/leads?${queryParams}`),
    placeholderData: prev => prev,
  })

  const bulkImportMutation = useMutation({
    mutationFn: (leads: unknown[]) => api.post<BulkImportResponse>('/leads/bulk', { leads }),
    onSuccess: (res) => {
      setBulkSuccess(`Imported: ${res.accepted}/${res.total} accepted, ${res.rejected} rejected.`)
      setBulkError('')
      setShowBulkImport(false)
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
    onError: (err) => setBulkError(err instanceof Error ? err.message : 'Bulk import failed'),
  })

  const leads = data?.leads ?? []
  const total = data?.total ?? 0
  const colMap = useMemo(() => new Map(ALL_COLUMNS.map(c => [c.key, c])), [])

  function handleSort(field: string) {
    setSort(prev => {
      const existing = prev.find(s => s.field === field)
      if (!existing) return [{ field, direction: 'asc' }, ...prev.slice(0, 2)]
      if (existing.direction === 'asc') return prev.map(s => s.field === field ? { ...s, direction: 'desc' as const } : s)
      return prev.filter(s => s.field !== field)
    })
    setPage(1)
  }

  function sortIndicator(field: string) {
    const s = sort.find(s => s.field === field)
    if (!s) return null
    const idx = sort.indexOf(s)
    return (
      <span style={{ marginLeft: 4, fontSize: 10, color: '#4facfe' }}>
        {s.direction === 'asc' ? '▲' : '▼'}
        {sort.length > 1 && <sup style={{ fontSize: 8 }}>{idx + 1}</sup>}
      </span>
    )
  }

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => prev.length === leads.length ? [] : leads.map(l => l.id))
  }, [leads])

  function handleFiltersChange(f: LeadFilters) {
    setFilters(f)
    setPage(1)
  }

  return (
    <div className="page-section">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Leads</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            {total > 0 ? `${total.toLocaleString()} total` : 'No leads yet'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-glass" style={{ fontSize: 12, padding: '7px 14px' }} onClick={() => setShowColumns(true)}>⚙ Columns</button>
          <button className="btn-primary" style={{ fontSize: 12, padding: '7px 14px' }} onClick={() => { setBulkError(''); setShowBulkImport(true) }}>⤴ Bulk Import</button>
          <button className="btn-glass" style={{ fontSize: 12, padding: '7px 14px' }} onClick={() => setShowExport(true)}>⬇ Export</button>
        </div>
      </div>

      {bulkSuccess && (
        <div className="form-alert form-alert-success" style={{ marginBottom: 14 }}>
          {bulkSuccess}
          <button onClick={() => setBulkSuccess('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: 8 }}>✕</button>
        </div>
      )}

      {/* View tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid var(--glass-border)' }}>
        {views.map((v, i) => (
          <button
            key={v.id}
            onClick={() => {
              setActiveViewIdx(i)
              setColumns(v.columns)
              setFilters(v.filters)
              setSort(v.sort)
              setPageSize(v.page_size)
              setPage(1)
            }}
            style={{
              padding: '8px 16px', fontSize: 12,
              fontWeight: activeViewIdx === i ? 600 : 400,
              color: activeViewIdx === i ? '#4facfe' : 'var(--text-2)',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: activeViewIdx === i ? '2px solid #4facfe' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {v.name}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            className="glass-input"
            placeholder="Search leads by name, email, or phone..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ width: '100%', fontSize: 13, padding: '10px 14px 10px 36px' }}
          />
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: 14 }}>🔍</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Show</span>
          <select className="glass-input" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }} style={{ fontSize: 12, padding: '6px 8px', width: 65 }}>
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Filters */}
      <FilterPanel
        filters={filters}
        onChange={handleFiltersChange}
        presets={presets}
        onSavePreset={() => {}}
        onLoadPreset={(p) => { setFilters(p.filters); setPage(1) }}
        onDeletePreset={() => {}}
      />

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#f87171', marginBottom: 14 }}>
          {error instanceof Error ? error.message : 'Failed to load leads'}
        </div>
      )}

      {/* Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
        {isFetching && (
          <div style={{ height: 2, background: 'var(--glass-bright)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #4facfe, #00f2fe)', animation: 'pulse 1.5s infinite' }} />
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className="glass-table" style={{ minWidth: columns.reduce((sum, k) => sum + (colMap.get(k)?.width ?? 100), 40) }}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === leads.length && leads.length > 0}
                    onChange={toggleSelectAll}
                    style={{ accentColor: '#4facfe' }}
                  />
                </th>
                {columns.map(key => {
                  const col = colMap.get(key)
                  return (
                    <th
                      key={key}
                      style={{ width: col?.width, cursor: col?.sortable ? 'pointer' : 'default', userSelect: 'none' }}
                      onClick={() => col?.sortable && handleSort(key)}
                    >
                      {col?.label ?? key}
                      {col?.sortable && sortIndicator(key)}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td><div style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--glass-bright)' }} /></td>
                  {columns.map((_, j) => (
                    <td key={j}><div style={{ height: 14, borderRadius: 7, background: 'var(--glass-bright)', width: '80%' }} /></td>
                  ))}
                </tr>
              ))}

              {!isLoading && leads.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: 14 }}>
                    {Object.keys(filters).length > 0 || search ? 'No leads matched the current filters.' : 'No leads yet. Send your first lead via the API.'}
                  </td>
                </tr>
              )}

              {leads.map(lead => (
                <tr
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  style={{ background: selectedIds.includes(lead.id) ? 'rgba(79,172,254,0.06)' : undefined }}
                >
                  <td onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      style={{ accentColor: '#4facfe' }}
                    />
                  </td>
                  {columns.map(key => (
                    <td key={key}>{renderCell(lead, key)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationBar total={total} page={page} pageSize={pageSize} itemLabel="leads" onPageChange={setPage} />
      </div>

      {/* Bulk actions bar */}
      <BulkActionsBar selectedIds={selectedIds} onClear={() => setSelectedIds([])} />

      {/* Lead detail slide-over */}
      {selectedLeadId && (
        <LeadDetailPanel leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
      )}

      {/* Column picker */}
      {showColumns && (
        <ColumnPicker selected={columns} onSave={setColumns} onClose={() => setShowColumns(false)} />
      )}

      {/* Export modal */}
      {showExport && (
        <ExportModal
          filters={filters}
          totalLeads={total}
          onExport={(cols, fmt) => {
            api.post('/leads/export', { columns: cols, format: fmt, filters }).catch(() => {})
          }}
          onClose={() => setShowExport(false)}
        />
      )}

      {/* Bulk import modal */}
      {showBulkImport && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowBulkImport(false)}>
          <form className="modal-box" style={{ maxWidth: 840 }} onSubmit={e => {
            e.preventDefault()
            setBulkError('')
            let parsed: unknown[]
            try {
              const data = JSON.parse(bulkPayload)
              if (!Array.isArray(data)) throw new Error('Payload must be a JSON array')
              parsed = data
            } catch {
              setBulkError('Invalid JSON payload. Provide an array of leads.')
              return
            }
            bulkImportMutation.mutate(parsed)
          }}>
            <div className="form-header">
              <div>
                <div className="form-title">Bulk Import Leads</div>
                <div className="form-subtitle">Upload up to 10,000 leads in one request via `/leads/bulk`.</div>
              </div>
              <button type="button" className="btn-ghost" style={{ width: 32, height: 32, borderRadius: 16, padding: 0, justifyContent: 'center' }} onClick={() => setShowBulkImport(false)}>✕</button>
            </div>
            {bulkError && <div className="form-alert form-alert-error" style={{ marginBottom: 12 }}>{bulkError}</div>}
            <div className="form-field">
              <label className="form-label" htmlFor="bulk-payload">Leads JSON Array</label>
              <textarea id="bulk-payload" className="form-control" value={bulkPayload} onChange={e => setBulkPayload(e.target.value)} rows={13} style={{ fontFamily: 'SF Mono, Menlo, Consolas, monospace', fontSize: 12 }} />
              <div className="form-help">Required fields per lead: `first_name`, `email`, `phone`, `country`.</div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={() => setShowBulkImport(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={bulkImportMutation.isPending}>{bulkImportMutation.isPending ? 'Importing...' : 'Run Bulk Import'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
