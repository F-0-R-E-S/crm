import clsx from 'clsx'
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
    <div className={clsx('flex gap-3 py-3', isUser ? 'flex-row-reverse' : '')}>
      <div
        className={clsx(
          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
          isUser ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-700'
        )}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      <div className={clsx('max-w-[85%] space-y-2', isUser ? 'text-right' : '')}>
        <div
          className={clsx(
            'inline-block px-3 py-2 rounded-lg text-sm leading-relaxed',
            isUser
              ? 'bg-brand-600 text-white rounded-br-none'
              : 'bg-gray-100 text-gray-900 rounded-bl-none'
          )}
        >
          <div className="whitespace-pre-wrap break-words">
            {message.content}
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-brand-500 ml-0.5 animate-pulse" />
            )}
          </div>
        </div>

        {toolCalls.length > 0 && (
          <div className="space-y-1">
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
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
      <span className="font-mono">{toolCall.name}</span>
      {toolCall.result ? (
        <span className="text-green-600">done</span>
      ) : (
        <span className="animate-spin">...</span>
      )}
    </div>
  )
}
