import { useCallback, useRef } from 'react'
import { useAssistantStore } from '../stores/assistant'
import { assistantApi } from '../lib/assistantApi'

export function useAssistantSSE() {
  const abortRef = useRef<AbortController | null>(null)

  const {
    appendStreamDelta,
    addToolCall,
    updateToolResult,
    setStreaming,
    setStreamingMessage,
    finalizeStreamingMessage,
    setPendingConfirmation,
  } = useAssistantStore.getState()

  const sendMessage = useCallback(
    async (sessionId: string, message: string, confirmationToken?: string) => {
      if (abortRef.current) {
        abortRef.current.abort()
      }

      const abort = new AbortController()
      abortRef.current = abort

      setStreaming(true)
      setStreamingMessage(null)

      try {
        const response = await assistantApi.sendMessage(
          sessionId,
          message,
          confirmationToken
        )

        if (!response.ok || !response.body) {
          throw new Error('Stream failed')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          let currentEvent = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7)
              continue
            }

            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              try {
                const parsed = JSON.parse(data)
                handleSSEEvent(currentEvent, parsed)
              } catch {
                // non-JSON data, skip
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('SSE error:', err)
        }
      } finally {
        finalizeStreamingMessage()
        setStreaming(false)
        abortRef.current = null
      }
    },
    []
  )

  const handleSSEEvent = useCallback(
    (event: string, data: Record<string, unknown>) => {
      switch (event) {
        case 'content_delta':
          appendStreamDelta(data.delta as string)
          break

        case 'tool_use':
          addToolCall({
            id: data.id as string,
            name: data.tool as string,
          })
          break

        case 'tool_result': {
          const result = data.result as Record<string, unknown>
          updateToolResult(data.id as string, JSON.stringify(result))

          if (result?.requires_confirmation) {
            setPendingConfirmation({
              token: result.confirmation_token as string,
              toolName: result.tool_name as string,
              toolInput: result.tool_input as Record<string, unknown>,
              impactAnalysis: result.impact_analysis as Record<string, unknown>,
            })
          }
          break
        }

        case 'message_stop':
          break

        case 'error':
          appendStreamDelta(`\n\n**Error:** ${data.error}`)
          break
      }
    },
    []
  )

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }, [])

  return { sendMessage, cancel }
}
