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

  const panelStyle: React.CSSProperties = {
    position: 'fixed', top: 0, right: 0, bottom: 0,
    width: 400, zIndex: 300,
    background: 'rgba(8,14,29,0.92)',
    backdropFilter: 'blur(32px) saturate(180%)',
    WebkitBackdropFilter: 'blur(32px) saturate(180%)',
    borderLeft: '1px solid rgba(255,255,255,0.10)',
    display: 'flex', flexDirection: 'column',
    boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
  }

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>AI Assistant</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={handleNewSession} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }} title="New conversation">+</button>
          <button onClick={close} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      </div>

      {/* Session list */}
      {!currentSessionId && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sessions.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>🤖</div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: 20 }}>
                Ask about your leads, brokers, routing rules, or give commands like "show today's stats" or "pause broker X".
              </p>
              <button onClick={handleNewSession} className="btn-primary" style={{ fontSize: 13 }}>
                Start Conversation
              </button>
            </div>
          ) : (
            <div style={{ padding: 8 }}>
              {sessions.map((session) => (
                <div key={session.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px', borderRadius: 10, cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div style={{ flex: 1, minWidth: 0 }} onClick={() => setCurrentSession(session.id)}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.title}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{session.message_count} messages</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', fontSize: 14, padding: 4 }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat view */}
      {currentSessionId && (
        <>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => { cancel(); setCurrentSession(null); setMessages([]) }}
              style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              ← All conversations
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {messages.length === 0 && !streamingMessage && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
                Send a message to get started
              </div>
            )}
            {messages.map((msg) => (
              <AssistantMessage key={msg.id} message={msg} />
            ))}
            {streamingMessage && <AssistantMessage message={streamingMessage} isStreaming />}
            <div ref={messagesEndRef} />
          </div>

          <AssistantInput onSend={handleSend} disabled={isStreaming} />
        </>
      )}
    </div>
  )
}
