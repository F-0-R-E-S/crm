import { useState, useRef, useCallback } from 'react'
import { useAssistantStore, type PendingConfirmation } from '../stores/assistant'

interface Props {
  onSend: (message: string, confirmationToken?: string) => void
  disabled?: boolean
}

export default function AssistantInput({ onSend, disabled }: Props) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { pendingConfirmation, setPendingConfirmation } = useAssistantStore()

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [input, disabled, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [])

  const handleConfirm = useCallback(
    (confirm: boolean) => {
      if (!pendingConfirmation) return
      if (confirm) {
        onSend('Yes, proceed', pendingConfirmation.token)
      }
      setPendingConfirmation(null)
    },
    [pendingConfirmation, onSend, setPendingConfirmation]
  )

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: 12 }}>
      {pendingConfirmation && (
        <ConfirmationBar
          confirmation={pendingConfirmation}
          onConfirm={() => handleConfirm(true)}
          onCancel={() => handleConfirm(false)}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask about leads, brokers, or give a command…"
          disabled={disabled}
          rows={1}
          style={{
            flex: 1, resize: 'none', borderRadius: 12,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.10)',
            padding: '9px 12px', fontSize: 13,
            color: 'rgba(255,255,255,0.88)',
            fontFamily: 'inherit', outline: 'none',
            opacity: disabled ? 0.5 : 1,
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(79,172,254,0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79,172,254,0.10)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.boxShadow = 'none' }}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !input.trim()}
          style={{
            padding: '9px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#4facfe,#00f2fe)',
            color: '#fff', fontSize: 13, fontWeight: 600,
            opacity: disabled || !input.trim() ? 0.4 : 1,
            flexShrink: 0,
          }}
        >↑</button>
      </div>
    </div>
  )
}

function ConfirmationBar({
  confirmation,
  onConfirm,
  onCancel,
}: {
  confirmation: PendingConfirmation
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div style={{ marginBottom: 10, padding: '10px 14px', background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.22)', borderRadius: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24', marginBottom: 4 }}>
        Confirmation: {confirmation.toolName}
      </div>
      {confirmation.impactAnalysis && (
        <div style={{ fontSize: 12, color: 'rgba(251,191,36,0.7)', marginBottom: 8 }}>
          {(confirmation.impactAnalysis as { description?: string }).description}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onConfirm} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(251,191,36,0.2)', color: '#fbbf24', fontSize: 12, fontWeight: 600 }}>Confirm</button>
        <button onClick={onCancel} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Cancel</button>
      </div>
    </div>
  )
}
