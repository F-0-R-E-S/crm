import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { BulkActionResponse } from '../types/leads'

interface Props {
  selectedIds: string[]
  onClear: () => void
}

const ACTIONS = [
  { key: 'resend', label: 'Resend', icon: '↻', confirm: false },
  { key: 'change_status', label: 'Change Status', icon: '⟳', confirm: false },
  { key: 'add_tags', label: 'Add Tags', icon: '🏷', confirm: false },
  { key: 'remove_tags', label: 'Remove Tags', icon: '✂', confirm: false },
  { key: 'add_comment', label: 'Add Comment', icon: '💬', confirm: false },
  { key: 'export', label: 'Export Selected', icon: '⬇', confirm: false },
  { key: 'block', label: 'Block', icon: '⊘', confirm: true },
  { key: 'unblock', label: 'Unblock', icon: '✓', confirm: false },
  { key: 'assign_manager', label: 'Assign Manager', icon: '👤', confirm: false },
  { key: 'move_uad', label: 'Move to UAD', icon: '↗', confirm: false },
  { key: 'change_attribution', label: 'Change Attribution', icon: '🔗', confirm: false },
  { key: 'delete', label: 'Delete', icon: '🗑', confirm: true },
]

export default function BulkActionsBar({ selectedIds, onClear }: Props) {
  const queryClient = useQueryClient()
  const [showMenu, setShowMenu] = useState(false)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [actionParam, setActionParam] = useState('')
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const bulkMutation = useMutation({
    mutationFn: (payload: { action: string; lead_ids: string[]; params?: Record<string, unknown> }) =>
      api.post<BulkActionResponse>('/leads/bulk-action', payload),
    onSuccess: (res) => {
      setProgress({ done: res.processed, total: res.total })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      setTimeout(() => { setProgress(null); setActiveAction(null); onClear() }, 2000)
    },
  })

  function executeAction(action: string) {
    const params: Record<string, unknown> = {}
    if (action === 'change_status') params.status = actionParam
    if (action === 'add_tags' || action === 'remove_tags') params.tags = actionParam.split(',').map(t => t.trim())
    if (action === 'add_comment') params.comment = actionParam
    if (action === 'assign_manager') params.manager_id = actionParam
    bulkMutation.mutate({ action, lead_ids: selectedIds, params })
  }

  if (selectedIds.length === 0) return null

  return (
    <div style={{
      position: 'sticky', bottom: 0, left: 0, right: 0, zIndex: 50,
      background: 'rgba(13,21,38,0.95)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--glass-border)',
      padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
        {selectedIds.length} selected
      </div>
      <button className="btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={onClear}>Clear</button>

      <div style={{ flex: 1 }} />

      {progress && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 120, height: 4, borderRadius: 2, background: 'var(--glass-bright)', overflow: 'hidden' }}>
            <div style={{ width: `${(progress.done / progress.total) * 100}%`, height: '100%', background: 'var(--grad-blue)', transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{progress.done}/{progress.total}</span>
        </div>
      )}

      {activeAction ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {['change_status', 'add_tags', 'remove_tags', 'add_comment', 'assign_manager'].includes(activeAction) && (
            <input
              className="glass-input"
              placeholder={activeAction === 'change_status' ? 'new status...' : activeAction === 'add_comment' ? 'comment...' : 'value...'}
              value={actionParam}
              onChange={e => setActionParam(e.target.value)}
              style={{ fontSize: 12, padding: '6px 10px', width: 180 }}
              autoFocus
            />
          )}
          <button className="btn-primary" style={{ fontSize: 11, padding: '6px 12px' }} onClick={() => executeAction(activeAction)} disabled={bulkMutation.isPending}>
            {bulkMutation.isPending ? 'Processing...' : 'Confirm'}
          </button>
          <button className="btn-ghost" style={{ fontSize: 11, padding: '6px 10px' }} onClick={() => { setActiveAction(null); setActionParam('') }}>Cancel</button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <button className="btn-primary" style={{ fontSize: 12, padding: '7px 14px' }} onClick={() => setShowMenu(!showMenu)}>
            Actions ▾
          </button>
          {showMenu && (
            <div style={{
              position: 'absolute', bottom: '100%', right: 0, marginBottom: 6,
              background: 'rgba(13,21,38,0.98)', border: '1px solid var(--glass-border)',
              borderRadius: 12, padding: 6, minWidth: 200,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
              {ACTIONS.map(a => (
                <button
                  key={a.key}
                  onClick={() => {
                    if (a.confirm && !window.confirm(`Are you sure you want to ${a.label.toLowerCase()} ${selectedIds.length} leads?`)) return
                    if (['resend', 'block', 'unblock', 'delete', 'export', 'move_uad'].includes(a.key)) {
                      executeAction(a.key)
                    } else {
                      setActiveAction(a.key)
                    }
                    setShowMenu(false)
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: 'transparent', color: a.key === 'delete' ? '#f87171' : 'var(--text-1)',
                    fontSize: 12, textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ width: 18, textAlign: 'center' }}>{a.icon}</span>
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
