import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

interface Conversion {
  id: string
  lead_id: string
  broker_id: string
  affiliate_id: string
  conversion_type: string
  amount: string
  currency: string
  buy_price: string
  sell_price: string
  profit: string
  status: string
  broker_transaction_id: string
  is_fake: boolean
  converted_at: string
}

interface PLRow {
  broker_id?: string
  affiliate_id?: string
  conversion_count: number
  total_buy: string
  total_sell: string
  total_profit: string
}

type Tab = 'conversions' | 'pl' | 'pricing' | 'payouts'

export default function ConversionsPage() {
  const [tab, setTab] = useState<Tab>('conversions')
  const [conversions, setConversions] = useState<Conversion[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [plByBroker, setPLByBroker] = useState<PLRow[]>([])
  const [plByAffiliate, setPLByAffiliate] = useState<PLRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchConversions = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ conversions: Conversion[]; total: number }>(`/conversions?page=${page}&per_page=20`)
      setConversions(data.conversions || [])
      setTotal(data.total || 0)
    } catch { setConversions([]) }
    setLoading(false)
  }, [page])

  const fetchPL = useCallback(async () => {
    try {
      const [brokerData, affData] = await Promise.all([
        api.get<{ pl_by_broker: PLRow[] }>('/pl/by-broker'),
        api.get<{ pl_by_affiliate: PLRow[] }>('/pl/by-affiliate'),
      ])
      setPLByBroker(brokerData.pl_by_broker || [])
      setPLByAffiliate(affData.pl_by_affiliate || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (tab === 'conversions') fetchConversions()
    if (tab === 'pl') fetchPL()
  }, [tab, fetchConversions, fetchPL])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'conversions', label: 'Conversions' },
    { key: 'pl', label: 'P&L' },
    { key: 'pricing', label: 'Pricing Rules' },
    { key: 'payouts', label: 'Payouts' },
  ]

  return (
    <div className="page-section">
      <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-1)', marginBottom: 6 }}>
        Conversions & P&L
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
        Track FTDs, manage pricing, and monitor profit/loss
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

      {tab === 'conversions' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="glass-table">
            <thead>
              <tr>
                <th>Type</th><th>Amount</th><th>Buy</th><th>Sell</th>
                <th>Profit</th><th>Status</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>Loading...</td></tr>}
              {!loading && conversions.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No conversions yet</td></tr>
              )}
              {conversions.map(c => (
                <tr key={c.id}>
                  <td>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 999,
                      background: c.conversion_type === 'ftd' ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)',
                      color: c.conversion_type === 'ftd' ? '#34d399' : 'var(--text-2)',
                      textTransform: 'uppercase', fontWeight: 600,
                    }}>{c.conversion_type}</span>
                    {c.is_fake && <span style={{ marginLeft: 6, fontSize: 10, color: '#f87171', fontWeight: 600 }}>FAKE</span>}
                  </td>
                  <td style={{ fontWeight: 600 }}>{c.currency} {c.amount}</td>
                  <td style={{ color: 'var(--text-2)' }}>${c.buy_price}</td>
                  <td style={{ color: 'var(--text-2)' }}>${c.sell_price}</td>
                  <td style={{ fontWeight: 600, color: parseFloat(c.profit) >= 0 ? '#34d399' : '#f87171' }}>
                    ${c.profit}
                  </td>
                  <td><span className={`status-badge ${c.status}`}>{c.status}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{new Date(c.converted_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'pl' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="glass-card">
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: 'var(--text-1)' }}>P&L by Broker</h3>
            <table className="glass-table">
              <thead><tr><th>Broker</th><th>Count</th><th>Buy</th><th>Sell</th><th>Profit</th></tr></thead>
              <tbody>
                {plByBroker.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 11, color: 'var(--text-2)' }}>{r.broker_id?.slice(0, 8)}...</td>
                    <td>{r.conversion_count}</td>
                    <td>${r.total_buy}</td>
                    <td>${r.total_sell}</td>
                    <td style={{ fontWeight: 600, color: parseFloat(r.total_profit) >= 0 ? '#34d399' : '#f87171' }}>${r.total_profit}</td>
                  </tr>
                ))}
                {plByBroker.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-3)' }}>No data</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="glass-card">
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: 'var(--text-1)' }}>P&L by Affiliate</h3>
            <table className="glass-table">
              <thead><tr><th>Affiliate</th><th>Count</th><th>Buy</th><th>Sell</th><th>Profit</th></tr></thead>
              <tbody>
                {plByAffiliate.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 11, color: 'var(--text-2)' }}>{r.affiliate_id?.slice(0, 8)}...</td>
                    <td>{r.conversion_count}</td>
                    <td>${r.total_buy}</td>
                    <td>${r.total_sell}</td>
                    <td style={{ fontWeight: 600, color: parseFloat(r.total_profit) >= 0 ? '#34d399' : '#f87171' }}>${r.total_profit}</td>
                  </tr>
                ))}
                {plByAffiliate.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-3)' }}>No data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'pricing' && (
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: 'var(--text-1)' }}>Pricing Rules</h3>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
            Configure buy/sell prices by affiliate, broker, GEO, and funnel. Most specific rule wins.
          </p>
        </div>
      )}

      {tab === 'payouts' && (
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: 'var(--text-1)' }}>Affiliate Payouts</h3>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
            Track accrued amounts, create payout records, and manage approval workflow.
          </p>
        </div>
      )}

      {tab === 'conversions' && total > 20 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
          <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
          <span style={{ color: 'var(--text-2)', fontSize: 13, alignSelf: 'center' }}>Page {page}</span>
          <button className="btn-ghost" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </div>
  )
}
