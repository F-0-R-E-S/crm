import { useState, useEffect } from 'react'
import { api } from '../lib/api'

interface ModelStatus {
  version: string
  accuracy: number
  precision: number
  recall: number
  f1_score: number
}

interface FeatureImportance {
  feature: string
  importance: number
}

interface VelocityRule {
  id: string
  name: string
  window_seconds: number
  max_count: number
  violations_24h: number
}

interface IntelligenceStats {
  contributed: number
  blocked: number
  network_size: number
}

interface FraudAnalyticsData {
  model_status: ModelStatus
  feature_importance: FeatureImportance[]
  score_comparison: {
    rule_based: Record<string, number>
    ml_based: Record<string, number>
  }
}

export default function FraudAnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<FraudAnalyticsData | null>(null)
  const [velocityRules, setVelocityRules] = useState<VelocityRule[]>([])
  const [intelligence, setIntelligence] = useState<IntelligenceStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get<FraudAnalyticsData>('/fraud/analytics'),
      api.get<VelocityRule[]>('/fraud/velocity-rules'),
      api.get<IntelligenceStats>('/fraud/intelligence/check'),
    ])
      .then(([analytics, rules, intel]) => {
        setAnalyticsData(analytics)
        setVelocityRules(rules)
        setIntelligence(intel)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const maxImportance = analyticsData
    ? Math.max(...analyticsData.feature_importance.map((f) => f.importance), 0.01)
    : 1

  return (
    <div className="page-section">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)' }}>Fraud Analytics</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            ML model performance and fraud intelligence
          </p>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)', fontSize: 14 }}>
          Loading analytics...
        </div>
      )}

      {!loading && analyticsData && (
        <>
          {/* ML Model Status */}
          <div
            style={{
              background: 'var(--glass-light)',
              backdropFilter: 'var(--blur-md)',
              WebkitBackdropFilter: 'var(--blur-md)',
              border: '1px solid var(--glass-border)',
              borderRadius: 20,
              padding: '24px',
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 16 }}>ML Model Status</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
              {[
                { label: 'Version', value: analyticsData.model_status.version },
                { label: 'Accuracy', value: `${(analyticsData.model_status.accuracy * 100).toFixed(1)}%` },
                { label: 'Precision', value: `${(analyticsData.model_status.precision * 100).toFixed(1)}%` },
                { label: 'Recall', value: `${(analyticsData.model_status.recall * 100).toFixed(1)}%` },
                { label: 'F1 Score', value: `${(analyticsData.model_status.f1_score * 100).toFixed(1)}%` },
              ].map((metric) => (
                <div
                  key={metric.label}
                  style={{
                    background: 'var(--glass-light)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 16,
                    padding: '16px 20px',
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>{metric.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>{metric.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Feature Importance */}
          <div
            style={{
              background: 'var(--glass-light)',
              backdropFilter: 'var(--blur-md)',
              WebkitBackdropFilter: 'var(--blur-md)',
              border: '1px solid var(--glass-border)',
              borderRadius: 20,
              padding: '24px',
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 16 }}>Feature Importance</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {analyticsData.feature_importance.map((f) => (
                <div key={f.feature} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 140, fontSize: 12, color: 'var(--text-2)', flexShrink: 0 }}>{f.feature}</div>
                  <div style={{ flex: 1, height: 20, background: 'var(--glass-border)', borderRadius: 6, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${(f.importance / maxImportance) * 100}%`,
                        background: 'linear-gradient(90deg, #4facfe, #00f2fe)',
                        borderRadius: 6,
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                  <div style={{ width: 50, fontSize: 12, fontWeight: 600, color: 'var(--text-1)', textAlign: 'right' }}>
                    {(f.importance * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Score Comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Rule-based distribution */}
            <div
              style={{
                background: 'var(--glass-light)',
                backdropFilter: 'var(--blur-md)',
                WebkitBackdropFilter: 'var(--blur-md)',
                border: '1px solid var(--glass-border)',
                borderRadius: 20,
                padding: '24px',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 16 }}>Rule-Based Score Distribution</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 100 }}>
                {Object.entries(analyticsData.score_comparison.rule_based).map(([range, count]) => {
                  const max = Math.max(...Object.values(analyticsData.score_comparison.rule_based), 1)
                  return (
                    <div key={range} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{count}</div>
                      <div
                        style={{
                          width: '100%',
                          height: `${(count / max) * 80}px`,
                          minHeight: 4,
                          background: '#a78bfa',
                          borderRadius: 4,
                        }}
                      />
                      <div style={{ fontSize: 9, color: 'var(--text-3)' }}>{range}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ML-based distribution */}
            <div
              style={{
                background: 'var(--glass-light)',
                backdropFilter: 'var(--blur-md)',
                WebkitBackdropFilter: 'var(--blur-md)',
                border: '1px solid var(--glass-border)',
                borderRadius: 20,
                padding: '24px',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 16 }}>ML Score Distribution</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 100 }}>
                {Object.entries(analyticsData.score_comparison.ml_based).map(([range, count]) => {
                  const max = Math.max(...Object.values(analyticsData.score_comparison.ml_based), 1)
                  return (
                    <div key={range} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{count}</div>
                      <div
                        style={{
                          width: '100%',
                          height: `${(count / max) * 80}px`,
                          minHeight: 4,
                          background: '#4facfe',
                          borderRadius: 4,
                        }}
                      />
                      <div style={{ fontSize: 9, color: 'var(--text-3)' }}>{range}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Velocity Rules */}
          <div
            style={{
              background: 'var(--glass-light)',
              backdropFilter: 'var(--blur-md)',
              WebkitBackdropFilter: 'var(--blur-md)',
              border: '1px solid var(--glass-border)',
              borderRadius: 20,
              padding: '24px',
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 16 }}>Velocity Rule Violations (24h)</div>
            {velocityRules.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>No velocity rules configured</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {velocityRules.map((rule) => (
                  <div
                    key={rule.id}
                    style={{
                      background: 'var(--glass-light)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 12,
                      padding: '14px 16px',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>{rule.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>
                      Max {rule.max_count} in {rule.window_seconds}s
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: rule.violations_24h > 0 ? '#f87171' : '#34d399' }}>
                      {rule.violations_24h}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>violations</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shared Intelligence */}
          {intelligence && (
            <div
              style={{
                background: 'var(--glass-light)',
                backdropFilter: 'var(--blur-md)',
                WebkitBackdropFilter: 'var(--blur-md)',
                border: '1px solid var(--glass-border)',
                borderRadius: 20,
                padding: '24px',
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 16 }}>Shared Intelligence Network</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div
                  style={{
                    background: 'var(--glass-light)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 16,
                    padding: '16px 20px',
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Contributed</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#34d399' }}>{intelligence.contributed.toLocaleString()}</div>
                </div>
                <div
                  style={{
                    background: 'var(--glass-light)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 16,
                    padding: '16px 20px',
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Blocked via Network</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#f87171' }}>{intelligence.blocked.toLocaleString()}</div>
                </div>
                <div
                  style={{
                    background: 'var(--glass-light)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 16,
                    padding: '16px 20px',
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Network Size</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)' }}>{intelligence.network_size}</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
