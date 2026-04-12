import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { api } from '../lib/api'

interface Broker {
  id: string
  name: string
  status: 'active' | 'inactive' | 'paused'
  template_id: string
  endpoint: string
  daily_cap: number
  total_cap: number
  priority: number
  health_status: string
  created_at: string
  updated_at: string
}

interface BrokerTemplate {
  id: string
  name: string
  version: number
  method: string
  auth_type: string
}

interface BrokerFormState {
  name: string
  templateId: string
  endpoint: string
  apiKey: string
  dailyCap: number
  priority: number
  status: Broker['status']
}

const INITIAL_FORM: BrokerFormState = {
  name: '',
  templateId: '',
  endpoint: '',
  apiKey: '',
  dailyCap: 500,
  priority: 1,
  status: 'active',
}

export default function BrokersPage() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingBrokerId, setEditingBrokerId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<BrokerFormState>(INITIAL_FORM)
  const [submitError, setSubmitError] = useState('')
  const [flashMessage, setFlashMessage] = useState('')

  const { data: brokersData, isLoading: loadingBrokers } = useQuery({
    queryKey: ['brokers'],
    queryFn: () => api.get<{ brokers: Broker[]; total: number }>('/brokers'),
  })

  const { data: templatesData } = useQuery({
    queryKey: ['broker-templates'],
    queryFn: () => api.get<{ templates: BrokerTemplate[]; total: number }>('/broker-templates'),
  })

  const brokers = brokersData?.brokers ?? []
  const templates = templatesData?.templates ?? []

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post<Broker>('/brokers', payload),
    onSuccess: (broker) => {
      setFlashMessage(`Broker "${broker.name}" created.`)
      closeModal()
      void queryClient.invalidateQueries({ queryKey: ['brokers'] })
    },
    onError: (error) => {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create broker')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      api.patch<Broker>(`/brokers/${id}`, payload),
    onSuccess: (broker) => {
      setFlashMessage(`Broker "${broker.name}" updated.`)
      closeModal()
      void queryClient.invalidateQueries({ queryKey: ['brokers'] })
    },
    onError: (error) => {
      setSubmitError(error instanceof Error ? error.message : 'Failed to update broker')
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Broker['status'] }) =>
      api.patch<Broker>(`/brokers/${id}`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['brokers'] })
    },
  })

  const filteredBrokers = brokers.filter((broker) => {
    const template = templates.find((item) => item.id === broker.template_id)
    const haystack = `${broker.name} ${broker.endpoint} ${template?.name ?? ''}`.toLowerCase()
    return haystack.includes(search.trim().toLowerCase())
  })

  const activeCount = brokers.filter((broker) => broker.status === 'active').length

  function closeModal() {
    setShowModal(false)
    setEditingBrokerId(null)
    setSubmitError('')
    setForm({
      ...INITIAL_FORM,
      templateId: templates[0]?.id ?? '',
      priority: brokers.length + 1,
    })
  }

  function openCreate() {
    setFlashMessage('')
    setEditingBrokerId(null)
    setSubmitError('')
    setForm({
      ...INITIAL_FORM,
      templateId: templates[0]?.id ?? '',
      priority: brokers.length + 1,
    })
    setShowModal(true)
  }

  function openEdit(broker: Broker) {
    setFlashMessage('')
    setEditingBrokerId(broker.id)
    setSubmitError('')
    setForm({
      name: broker.name,
      templateId: broker.template_id,
      endpoint: broker.endpoint,
      apiKey: '',
      dailyCap: broker.daily_cap,
      priority: broker.priority,
      status: broker.status,
    })
    setShowModal(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      template_id: form.templateId,
      endpoint: form.endpoint.trim(),
      daily_cap: form.dailyCap,
      priority: form.priority,
      status: form.status,
    }

    if (form.apiKey.trim()) {
      payload.credentials = { api_key: form.apiKey.trim() }
    }

    if (editingBrokerId) {
      updateMutation.mutate({ id: editingBrokerId, payload })
      return
    }

    createMutation.mutate(payload)
  }

  function getTemplateLabel(templateId: string) {
    const template = templates.find((item) => item.id === templateId)
    return template ? `${template.name} v${template.version}` : 'Unknown template'
  }

  function getHealthBadge(status: string) {
    if (status === 'healthy') return 'delivered'
    if (status === 'degraded') return 'processing'
    if (status === 'offline') return 'invalid'
    return 'new'
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="page-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Brokers</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            {activeCount} active · {brokers.length} total
          </p>
        </div>
        <button className="btn-primary" style={{ fontSize: 12, padding: '8px 18px' }} onClick={openCreate}>
          + Add Broker
        </button>
      </div>

      {flashMessage && (
        <div className="form-alert form-alert-success" style={{ marginBottom: 14 }}>
          {flashMessage}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: 14, pointerEvents: 'none' }}>⌕</span>
          <input
            className="glass-input"
            style={{ paddingLeft: 34 }}
            placeholder="Search brokers or endpoints..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="glass-table">
          <thead>
            <tr>
              <th>Broker</th>
              <th>Template</th>
              <th>Endpoint</th>
              <th>Daily Cap</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Health</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingBrokers ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3)' }}>
                  Loading brokers...
                </td>
              </tr>
            ) : filteredBrokers.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3)' }}>
                  No brokers found.
                </td>
              </tr>
            ) : (
              filteredBrokers.map((broker) => (
                <tr key={broker.id}>
                  <td className="td-primary" style={{ fontWeight: 600 }}>{broker.name}</td>
                  <td>{getTemplateLabel(broker.template_id)}</td>
                  <td style={{ maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{broker.endpoint}</td>
                  <td>{broker.daily_cap || 'none'}</td>
                  <td>{broker.priority}</td>
                  <td>
                    <span className={clsx('status-badge', broker.status === 'active' ? 'delivered' : broker.status === 'paused' ? 'processing' : 'invalid')}>
                      {broker.status}
                    </span>
                  </td>
                  <td>
                    <span className={clsx('status-badge', getHealthBadge(broker.health_status))}>
                      {broker.health_status || 'unknown'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button className="btn-ghost" onClick={() => openEdit(broker)}>Edit</button>
                      <button
                        className="btn-ghost"
                        onClick={() => toggleStatusMutation.mutate({ id: broker.id, status: broker.status === 'active' ? 'inactive' : 'active' })}
                        disabled={toggleStatusMutation.isPending}
                      >
                        {broker.status === 'active' ? 'Pause' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <form className="modal-box" style={{ maxWidth: 760 }} onSubmit={handleSubmit}>
            <div className="form-header">
              <div>
                <div className="form-title">{editingBrokerId ? 'Edit Broker' : 'Add Broker Integration'}</div>
                <div className="form-subtitle">Real broker records are stored in backend and used by routing services.</div>
              </div>
              <button
                type="button"
                className="btn-ghost"
                style={{ width: 32, height: 32, borderRadius: 16, padding: 0, justifyContent: 'center' }}
                onClick={closeModal}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {submitError && (
              <div className="form-alert form-alert-error" style={{ marginBottom: 12 }}>
                {submitError}
              </div>
            )}

            <div className="form-grid form-grid-2">
              <div className="form-field">
                <label className="form-label" htmlFor="broker-name">Broker Name</label>
                <input
                  id="broker-name"
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Binolla Markets"
                  required
                  autoFocus
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="broker-template">Template</label>
                <select
                  id="broker-template"
                  className="form-control"
                  value={form.templateId}
                  onChange={(e) => setForm((prev) => ({ ...prev, templateId: e.target.value }))}
                  required
                >
                  <option value="">Select template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} v{template.version}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" htmlFor="broker-endpoint">API Endpoint</label>
                <input
                  id="broker-endpoint"
                  className="form-control"
                  value={form.endpoint}
                  onChange={(e) => setForm((prev) => ({ ...prev, endpoint: e.target.value }))}
                  placeholder="https://broker.example.com/api/v2/leads"
                  required
                />
              </div>

              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" htmlFor="broker-key">API Key</label>
                <input
                  id="broker-key"
                  className="form-control"
                  value={form.apiKey}
                  onChange={(e) => setForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                  placeholder={editingBrokerId ? 'Leave empty to keep existing secret' : 'sk_live_xxx'}
                />
                <div className="form-help">Only sent when you provide a new value.</div>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="broker-cap">Daily Cap</label>
                <input
                  id="broker-cap"
                  type="number"
                  min={0}
                  className="form-control"
                  value={form.dailyCap}
                  onChange={(e) => setForm((prev) => ({ ...prev, dailyCap: Math.max(0, Number(e.target.value) || 0) }))}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="broker-priority">Priority</label>
                <input
                  id="broker-priority"
                  type="number"
                  min={0}
                  className="form-control"
                  value={form.priority}
                  onChange={(e) => setForm((prev) => ({ ...prev, priority: Math.max(0, Number(e.target.value) || 0) }))}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="broker-status">Status</label>
                <select
                  id="broker-status"
                  className="form-control"
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as Broker['status'] }))}
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="paused">paused</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting || !form.name.trim() || !form.templateId || !form.endpoint.trim()}
              >
                {isSubmitting ? 'Saving...' : editingBrokerId ? 'Save Changes' : 'Add Broker'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
