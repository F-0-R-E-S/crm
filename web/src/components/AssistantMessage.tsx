import type { AssistantMessage as MessageType } from '../lib/assistantApi'
import type { StreamingMessage, ToolCall } from '../stores/assistant'

interface Props {
  message: MessageType | StreamingMessage
  isStreaming?: boolean
}

function isStreamingMsg(msg: MessageType | StreamingMessage): msg is StreamingMessage {
  return 'toolCalls' in msg
}

export default function AssistantMessage({ message, isStreaming }: Props) {
  const isUser = message.role === 'user'
  const streaming = isStreamingMsg(message)
  const toolCalls = streaming ? message.toolCalls : []

  return (
    <div style={{ display: 'flex', gap: 10, padding: '8px 0', flexDirection: isUser ? 'row-reverse' : 'row' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700,
        background: isUser ? 'linear-gradient(135deg,#4facfe,#00f2fe)' : 'rgba(167,139,250,0.2)',
        color: isUser ? '#fff' : '#a78bfa',
        border: isUser ? 'none' : '1px solid rgba(167,139,250,0.3)',
      }}>
        {isUser ? 'U' : 'AI'}
      </div>

      <div style={{ maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: 6, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        <div style={{
          display: 'inline-block', padding: '9px 13px', borderRadius: 14,
          fontSize: 13, lineHeight: 1.55,
          background: isUser
            ? 'linear-gradient(135deg,rgba(79,172,254,0.22),rgba(0,242,254,0.14))'
            : 'rgba(255,255,255,0.06)',
          border: isUser ? '1px solid rgba(79,172,254,0.3)' : '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.88)',
          borderBottomRightRadius: isUser ? 4 : 14,
          borderBottomLeftRadius: isUser ? 14 : 4,
        }}>
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message.content}
            {isStreaming && (
              <span style={{ display: 'inline-block', width: 6, height: 14, background: '#4facfe', marginLeft: 2, borderRadius: 1, animation: 'pulse 1s infinite' }} />
            )}
          </div>
        </div>

        {toolCalls.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {toolCalls.map((tc: ToolCall) => (
              <ToolCallBadge key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ToolCallBadge({ toolCall }: { toolCall: ToolCall }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: 'rgba(79,172,254,0.12)', border: '1px solid rgba(79,172,254,0.25)', fontSize: 11, color: '#4facfe' }}>
      <span style={{ fontFamily: 'monospace' }}>{toolCall.name}</span>
      {toolCall.result ? (
        <span style={{ color: '#34d399' }}>✓</span>
      ) : (
        <span>…</span>
      )}
    </div>
  )
}
