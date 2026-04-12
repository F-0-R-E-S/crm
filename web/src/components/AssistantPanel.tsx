import { useEffect, useRef, useCallback } from 'react'
import { useAssistantStore } from '../stores/assistant'
import { assistantApi } from '../lib/assistantApi'
import { useAssistantSSE } from '../hooks/useAssistantSSE'
import { useAssistantWS } from '../hooks/useAssistantWS'
import AssistantMessage from './AssistantMessage'
import AssistantInput from './AssistantInput'
import clsx from 'clsx'

export default function AssistantPanel() {
  const {
    isOpen,
    close,
    sessions,
    setSessions,
    currentSessionId,
    setCurrentSession,
    messages,
    setMessages,
    addMessage,
    streamingMessage,
    isStreaming,
  } = useAssistantStore()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { sendMessage, cancel } = useAssistantSSE()
  useAssistantWS(currentSessionId || undefined)

  // Load sessions on open
  useEffect(() => {
    if (!isOpen) return
    assistantApi.listSessions().then((data) => {
      setSessions(data.sessions || [])
    }).catch(console.error)
  }, [isOpen, setSessions])

  // Load messages when session changes
  useEffect(() => {
    if (!currentSessionId) return
    assistantApi.getSession(currentSessionId).then((data) => {
      setMessages(data.messages || [])
    }).catch(console.error)
  }, [currentSessionId, setMessages])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingMessage])

  const handleNewSession = useCallback(async () => {
    try {
      const session = await assistantApi.createSession()
      setSessions([session, ...sessions])
      setCurrentSession(session.id)
      setMessages([])
    } catch (err) {
      console.error('Failed to create session:', err)
    }
  }, [sessions, setSessions, setCurrentSession, setMessages])

  const handleSend = useCallback(
    async (message: string, confirmationToken?: string) => {
      let sessionId = currentSessionId

      if (!sessionId) {
        const session = await assistantApi.createSession()
        setSessions([session, ...sessions])
        setCurrentSession(session.id)
        sessionId = session.id
      }

      addMessage({
        id: crypto.randomUUID(),
        session_id: sessionId,
        role: 'user',
        content: message,
        created_at: new Date().toISOString(),
      })

      await sendMessage(sessionId, message, confirmationToken)
    },
    [currentSessionId, sessions, setSessions, setCurrentSession, addMessage, sendMessage]
  )

  const handleDeleteSession = useCallback(
    async (id: string) => {
      try {
        await assistantApi.deleteSession(id)
        setSessions(sessions.filter((s) => s.id !== id))
        if (currentSessionId === id) {
          setCurrentSession(null)
          setMessages([])
        }
      } catch (err) {
        console.error('Failed to delete session:', err)
      }
    },
    [sessions, currentSessionId, setSessions, setCurrentSession, setMessages]
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl border-l border-gray-200 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <h2 className="text-sm font-semibold text-gray-900">AI Assistant</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewSession}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="New conversation"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={close}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Session list (when no session selected) */}
      {!currentSessionId && (
        <div className="flex-1 overflow-auto">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 px-6">
              <p className="text-sm text-center mb-4">
                Ask about your leads, brokers, routing rules, or give commands like
                "pause broker X" or "show today's stats".
              </p>
              <button
                onClick={handleNewSession}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
              >
                Start Conversation
              </button>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 cursor-pointer group"
                >
                  <div
                    className="flex-1 min-w-0"
                    onClick={() => setCurrentSession(session.id)}
                  >
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {session.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {session.message_count} messages
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteSession(session.id)
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat view */}
      {currentSessionId && (
        <>
          {/* Back button */}
          <div className="px-3 py-2 border-b border-gray-100">
            <button
              onClick={() => {
                cancel()
                setCurrentSession(null)
                setMessages([])
              }}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              All conversations
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto px-3">
            {messages.length === 0 && !streamingMessage && (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Send a message to get started
              </div>
            )}
            {messages.map((msg) => (
              <AssistantMessage key={msg.id} message={msg} />
            ))}
            {streamingMessage && (
              <AssistantMessage message={streamingMessage} isStreaming />
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <AssistantInput onSend={handleSend} disabled={isStreaming} />
        </>
      )}
    </div>
  )
}
