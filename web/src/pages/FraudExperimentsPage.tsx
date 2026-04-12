import { useState, useEffect } from 'react'
import { api } from '../lib/api'

interface Experiment {
  id: string
  name: string
  description: string
  status: 'draft' | 'running' | 'paused' | 'completed'
  control_config: Record<string, unknown>
  variant_config: Record<string, unknown>
  traffic_split: number
  started_at: string | null
  completed_at: string | null
  results?: {
    control_block_rate: number
    variant_block_rate: number
    control_false_positive: number
    variant_false_positive: number
  }
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'rgba(156,163,175,0.14)', text: '#9ca3af' },
  running: { bg: 'rgba(52,211,153,0.14)', text: '#34d399' },
  paused: { bg: 'rgba(251,191,36,0.14)', text: '#fbbf24' },
  completed: { bg: 'rgba(79,172,254,0.14)', text: '#4facfe' },
}

export default function FraudExperimentsPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  // Create form
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formControlConfig, setFormControlConfig] = useState('{}')
  const [formVariantConfig, setFormVariantConfig] = useState('{}')
  const [formTrafficSplit, setFormTrafficSplit] = useState(50)
  const [createError, setCreateError] = useState('')

  const fetchExperiments = () => {
    setLoading(true)
    api
      .get<Experiment[]>('/fraud/experiments')
      .then(setExperiments)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchExperiments()
  }, [])

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')

    let controlConfig: Record<string, unknown>
    let variantConfig: Record<string, unknown>
    try {
      controlConfig = JSON.parse(formControlConfig)
      variantConfig = JSON.parse(formVariantConfig)
    } catch {
      setCreateError('Invalid JSON in config fields')
      return
    }

    api
      .post('/fraud/experiments', {
        name: formName,
        description: formDescription,
        control_config: controlConfig,
        variant_config: variantConfig,
        traffic_split: formTrafficSplit,
      })
      .then(() => {
        setShowCreate(false)
        resetForm()
        fetchExperiments()
      })
      .catch((err) => setCreateError(err instanceof Error ? err.message : 'Failed to create experiment'))
  }

  const handleStatusChange = (id: string, status: string) => {
    api
      .put(`/fraud/experiments/${id}`, { status })
      .then(() => fetchExperiments())
      .catch(() => {})
  }

  const resetForm = () => {
    setFormName('')
    setFormDescription('')
    setFormControlConfig('{}')
    setFormVariantConfig('{}')
    setFormTrafficSplit(50)
    setCreateError('')
  }

  return (
    <div className="page-section">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Fraud Experiments</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            A/B testing for fraud detection strategies
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: '8px 16px',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + New Experiment
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)', fontSize: 14 }}>
          Loading experiments...
        </div>
      )}

      {!loading && experiments.length === 0 && (
        <div
          style={{
            background: 'var(--glass-light)',
            border: '1px solid var(--glass-border)',
            borderRadius: 20,
            padding: '40px',
            textAlign: 'center',
            color: 'var(--text-3)',
            fontSize: 14,
          }}
        >
          No experiments created yet. Start one to compare fraud detection strategies.
        </div>
      )}

      {/* Experiments table */}
      {!loading && experiments.length > 0 && (
        <div
          style={{
            background: 'var(--glass-light)',
            backdropFilter: 'var(--blur-md)',
            WebkitBackdropFilter: 'var(--blur-md)',
            border: '1px solid var(--glass-border)',
            borderRadius: 20,
            padding: 0,
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Name</th>
                <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Status</th>
                <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Traffic Split</th>
                <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Started</th>
                <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Results</th>
                <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {experiments.map((exp) => (
                <tr key={exp.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{exp.name}</div>
                    {exp.description && (
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{exp.description}</div>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: STATUS_COLORS[exp.status]?.bg || STATUS_COLORS.draft.bg,
                        color: STATUS_COLORS[exp.status]?.text || STATUS_COLORS.draft.text,
                      }}
                    >
                      {exp.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-2)' }}>
                    {exp.traffic_split}% / {100 - exp.traffic_split}%
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-2)' }}>
                    {exp.started_at ? new Date(exp.started_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12 }}>
                    {exp.results ? (
                      <div>
                        <div style={{ color: 'var(--text-2)' }}>
                          Block: <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{exp.results.control_block_rate.toFixed(1)}%</span> vs <span style={{ fontWeight: 600, color: '#4facfe' }}>{exp.results.variant_block_rate.toFixed(1)}%</span>
                        </div>
                        <div style={{ color: 'var(--text-2)', marginTop: 2 }}>
                          FP: <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{exp.results.control_false_positive.toFixed(1)}%</span> vs <span style={{ fontWeight: 600, color: '#4facfe' }}>{exp.results.variant_false_positive.toFixed(1)}%</span>
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-3)' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {exp.status === 'draft' && (
                        <button
                          onClick={() => handleStatusChange(exp.id, 'running')}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 8,
                            border: 'none',
                            background: 'rgba(52,211,153,0.14)',
                            color: '#34d399',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Start
                        </button>
                      )}
                      {exp.status === 'running' && (
                        <button
                          onClick={() => handleStatusChange(exp.id, 'paused')}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 8,
                            border: 'none',
                            background: 'rgba(251,191,36,0.14)',
                            color: '#fbbf24',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Pause
                        </button>
                      )}
                      {exp.status === 'paused' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(exp.id, 'running')}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 8,
                              border: 'none',
                              background: 'rgba(52,211,153,0.14)',
                              color: '#34d399',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Resume
                          </button>
                          <button
                            onClick={() => handleStatusChange(exp.id, 'completed')}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 8,
                              border: 'none',
                              background: 'rgba(79,172,254,0.14)',
                              color: '#4facfe',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Complete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Experiment Modal */}
      {showCreate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}
        >
          <form
            onSubmit={handleCreate}
            style={{
              background: 'var(--glass-light)',
              backdropFilter: 'var(--blur-md)',
              WebkitBackdropFilter: 'var(--blur-md)',
              border: '1px solid var(--glass-border)',
              borderRadius: 20,
              padding: '24px',
              width: '100%',
              maxWidth: 600,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)' }}>New Experiment</div>
              <button
                type="button"
                onClick={() => { setShowCreate(false); resetForm() }}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 18, cursor: 'pointer' }}
              >
                x
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Name</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Experiment name"
                  required
                  style={{
                    width: '100%',
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
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Description</label>
                <input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="What are you testing?"
                  style={{
                    width: '100%',
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
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Control Config (JSON)</label>
                <textarea
                  value={formControlConfig}
                  onChange={(e) => setFormControlConfig(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--glass-border)',
                    background: 'var(--glass-light)',
                    color: 'var(--text-1)',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Variant Config (JSON)</label>
                <textarea
                  value={formVariantConfig}
                  onChange={(e) => setFormVariantConfig(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--glass-border)',
                    background: 'var(--glass-light)',
                    color: 'var(--text-1)',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
                  Traffic Split: {formTrafficSplit}% control / {100 - formTrafficSplit}% variant
                </label>
                <input
                  type="range"
                  min={10}
                  max={90}
                  value={formTrafficSplit}
                  onChange={(e) => setFormTrafficSplit(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {createError && (
              <div style={{ marginTop: 12, fontSize: 12, color: '#f87171' }}>{createError}</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => { setShowCreate(false); resetForm() }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 12,
                  border: '1px solid var(--glass-border)',
                  background: 'var(--glass-light)',
                  color: 'var(--text-2)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Create Experiment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
