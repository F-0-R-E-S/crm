import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

interface Template {
  id: string
  name: string
  version: number
  method: string
  auth_type: string
  is_public: boolean
  category: string
  description: string
  rating: number
  install_count: number
  author: string
  tags: string[]
  created_at: string
}

type Tab = 'catalog' | 'installed' | 'submissions'

export default function MarketplacePage() {
  const [tab, setTab] = useState<Tab>('catalog')
  const [templates, setTemplates] = useState<Template[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('installs')
  const [loading, setLoading] = useState(true)

  const fetchCatalog = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '20', sort })
      if (search) params.set('search', search)
      if (category) params.set('category', category)
      const data = await api.get<{ templates: Template[]; total: number }>(`/marketplace?${params}`)
      setTemplates(data.templates || [])
      setTotal(data.total || 0)
    } catch { setTemplates([]) }
    setLoading(false)
  }, [page, search, category, sort])

  useEffect(() => { if (tab === 'catalog') fetchCatalog() }, [tab, fetchCatalog])

  const handleInstall = async (id: string) => {
    try {
      await api.post(`/marketplace/${id}/install`, {})
      fetchCatalog()
    } catch { /* ignore */ }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'catalog', label: 'Catalog' },
    { key: 'installed', label: 'Installed' },
    { key: 'submissions', label: 'My Submissions' },
  ]

  const renderStars = (rating: number) => {
    const full = Math.floor(rating)
    const half = rating - full >= 0.5
    return (
      <span style={{ fontSize: 12, letterSpacing: 1 }}>
        {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
        <span style={{ marginLeft: 4, fontSize: 11, color: 'var(--text-2)' }}>{rating.toFixed(1)}</span>
      </span>
    )
  }

  return (
    <div className="page-section">
      <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)', marginBottom: 6 }}>
        Integration Marketplace
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
        Browse 200+ broker templates, install with one click, and contribute your own
      </p>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--glass-border)', paddingBottom: 2 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            className={tab === t.key ? 'btn-primary' : 'btn-ghost'}
            style={{ fontSize: 12, padding: '6px 16px', borderRadius: '12px 12px 0 0' }}
            onClick={() => setTab(t.key)}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'catalog' && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
            <input className="glass-input" style={{ flex: 1, maxWidth: 280 }} placeholder="Search templates..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            <select className="btn-ghost" value={category} onChange={e => { setCategory(e.target.value); setPage(1) }}
              style={{ background: 'var(--glass-light)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '6px 12px', color: 'var(--text-2)', fontSize: 12 }}>
              <option value="">All Categories</option>
              <option value="forex">Forex</option>
              <option value="crypto">Crypto</option>
              <option value="binary">Binary Options</option>
              <option value="cpa">CPA Network</option>
              <option value="general">General</option>
            </select>
            <select className="btn-ghost" value={sort} onChange={e => setSort(e.target.value)}
              style={{ background: 'var(--glass-light)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '6px 12px', color: 'var(--text-2)', fontSize: 12 }}>
              <option value="installs">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {loading && <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>Loading...</div>}
            {!loading && templates.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No templates found</div>
            )}
            {templates.map(t => (
              <div key={t.id} className="glass-card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>{t.name}</h3>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', color: 'var(--text-3)' }}>
                        {t.category}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>v{t.version}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{t.method}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(79,172,254,0.1)', color: '#4facfe' }}>
                    {t.auth_type}
                  </span>
                </div>

                {t.description && (
                  <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.5 }}>
                    {t.description.slice(0, 120)}{t.description.length > 120 ? '...' : ''}
                  </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {renderStars(t.rating || 0)}
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{t.install_count || 0} installs</span>
                  </div>
                  <button className="btn-primary" style={{ fontSize: 11, padding: '5px 14px' }} onClick={() => handleInstall(t.id)}>
                    Install
                  </button>
                </div>

                {t.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
                    {t.tags.map(tag => (
                      <span key={tag} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', color: 'var(--text-3)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {total > 20 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
              <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
              <span style={{ color: 'var(--text-2)', fontSize: 13, alignSelf: 'center' }}>Page {page}</span>
              <button className="btn-ghost" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}

      {tab === 'installed' && (
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: 'var(--text-1)' }}>Installed Integrations</h3>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
            View and manage your installed broker templates. Update to new versions or uninstall.
          </p>
        </div>
      )}

      {tab === 'submissions' && (
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: 'var(--text-1)' }}>My Submissions</h3>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
            Submit your own broker integration templates to the community marketplace.
          </p>
          <button className="btn-primary" style={{ marginTop: 12, fontSize: 12 }}>+ New Submission</button>
        </div>
      )}
    </div>
  )
}
