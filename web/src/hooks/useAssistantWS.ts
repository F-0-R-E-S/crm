import { useEffect, useRef, useCallback } from 'react'
import { useAssistantStore } from '../stores/assistant'
import { useAuthStore } from '../stores/auth'

interface RealtimeEvent {
  type: string
  source: string
  timestamp: string
  data: Record<string, unknown>
}

export function useAssistantWS(sessionId?: string) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>()

  const connect = useCallback(() => {
    const token = useAuthStore.getState().token
    if (!token) return

    const wsBase = (import.meta.env.VITE_API_URL || '/api').replace(/^http/, 'ws')
    const params = new URLSearchParams()
    if (sessionId) params.set('session_id', sessionId)
    params.set('token', token)

    const url = `${wsBase}/v1/assistant/ws?${params.toString()}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      console.debug('[assistant-ws] connected')
    }

    ws.onmessage = (event) => {
      try {
        const lines = (event.data as string).split('\n')
        let eventType = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7)
          } else if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6)) as RealtimeEvent
            handleRealtimeEvent(eventType || 'realtime_event', data)
          }
        }
      } catch {
        // SSE-over-WS parse issue, skip
      }
    }

    ws.onclose = () => {
      console.debug('[assistant-ws] disconnected, reconnecting in 5s')
      reconnectRef.current = setTimeout(connect, 5000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [sessionId])

  const handleRealtimeEvent = useCallback(
    (eventType: string, data: RealtimeEvent) => {
      const store = useAssistantStore.getState()
      if (!store.isOpen) return

      switch (eventType) {
        case 'alert':
        case 'fraud_alert':
          console.info(`[assistant-ws] ${eventType}:`, data)
          break
        case 'realtime_event':
          break
      }
    },
    []
  )

  useEffect(() => {
    connect()
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const disconnect = useCallback(() => {
    if (reconnectRef.current) clearTimeout(reconnectRef.current)
    wsRef.current?.close()
    wsRef.current = null
  }, [])

  return { disconnect }
}
