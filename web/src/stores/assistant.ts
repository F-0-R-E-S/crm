import { create } from 'zustand'
import type { AssistantSession, AssistantMessage } from '../lib/assistantApi'

export interface StreamingMessage {
  id: string
  role: 'assistant'
  content: string
  toolCalls: ToolCall[]
  isStreaming: boolean
}

export interface ToolCall {
  id: string
  name: string
  result?: string
}

interface AssistantState {
  isOpen: boolean
  sessions: AssistantSession[]
  currentSessionId: string | null
  messages: AssistantMessage[]
  streamingMessage: StreamingMessage | null
  isStreaming: boolean
  pendingConfirmation: PendingConfirmation | null

  toggle: () => void
  open: () => void
  close: () => void
  setSessions: (sessions: AssistantSession[]) => void
  setCurrentSession: (id: string | null) => void
  setMessages: (messages: AssistantMessage[]) => void
  addMessage: (message: AssistantMessage) => void
  setStreaming: (streaming: boolean) => void
  setStreamingMessage: (msg: StreamingMessage | null) => void
  appendStreamDelta: (delta: string) => void
  addToolCall: (toolCall: ToolCall) => void
  updateToolResult: (toolId: string, result: string) => void
  setPendingConfirmation: (confirmation: PendingConfirmation | null) => void
  finalizeStreamingMessage: () => void
}

export interface PendingConfirmation {
  token: string
  toolName: string
  toolInput: Record<string, unknown>
  impactAnalysis?: Record<string, unknown>
}

export const useAssistantStore = create<AssistantState>((set, get) => ({
  isOpen: false,
  sessions: [],
  currentSessionId: null,
  messages: [],
  streamingMessage: null,
  isStreaming: false,
  pendingConfirmation: null,

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),

  setSessions: (sessions) => set({ sessions }),
  setCurrentSession: (id) => set({ currentSessionId: id }),
  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((s) => ({ messages: [...s.messages, message] })),

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  setStreamingMessage: (msg) => set({ streamingMessage: msg }),

  appendStreamDelta: (delta) =>
    set((s) => {
      if (!s.streamingMessage) {
        return {
          streamingMessage: {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: delta,
            toolCalls: [],
            isStreaming: true,
          },
        }
      }
      return {
        streamingMessage: {
          ...s.streamingMessage,
          content: s.streamingMessage.content + delta,
        },
      }
    }),

  addToolCall: (toolCall) =>
    set((s) => {
      if (!s.streamingMessage) return s
      return {
        streamingMessage: {
          ...s.streamingMessage,
          toolCalls: [...s.streamingMessage.toolCalls, toolCall],
        },
      }
    }),

  updateToolResult: (toolId, result) =>
    set((s) => {
      if (!s.streamingMessage) return s
      return {
        streamingMessage: {
          ...s.streamingMessage,
          toolCalls: s.streamingMessage.toolCalls.map((tc) =>
            tc.id === toolId ? { ...tc, result } : tc
          ),
        },
      }
    }),

  setPendingConfirmation: (confirmation) =>
    set({ pendingConfirmation: confirmation }),

  finalizeStreamingMessage: () =>
    set((s) => {
      if (!s.streamingMessage) return s
      const msg: AssistantMessage = {
        id: s.streamingMessage.id,
        session_id: s.currentSessionId || '',
        role: 'assistant',
        content: s.streamingMessage.content,
        created_at: new Date().toISOString(),
      }
      return {
        messages: [...s.messages, msg],
        streamingMessage: null,
        isStreaming: false,
      }
    }),
}))
