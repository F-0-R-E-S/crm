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
    <div className="border-t border-gray-200 p-3">
      {pendingConfirmation && (
        <ConfirmationBar
          confirmation={pendingConfirmation}
          onConfirm={() => handleConfirm(true)}
          onCancel={() => handleConfirm(false)}
        />
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your leads, brokers, or give a command..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !input.trim()}
          className="px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium
                     hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors shrink-0"
        >
          Send
        </button>
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
    <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="text-sm font-medium text-amber-800 mb-1">
        Confirmation required: {confirmation.toolName}
      </div>
      {confirmation.impactAnalysis && (
        <div className="text-xs text-amber-700 mb-2">
          {(confirmation.impactAnalysis as { description?: string }).description}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className="px-3 py-1 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700"
        >
          Confirm
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
