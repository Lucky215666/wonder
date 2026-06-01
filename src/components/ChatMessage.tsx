import { UserOutlined, RobotOutlined } from '@ant-design/icons'

interface Props {
  role: 'user' | 'assistant'
  content: string
  sources?: { docIds: string[]; chunks: string[] }
}

export default function ChatMessage({ role, content, sources }: Props) {
  const isUser = role === 'user'

  return (
    <div className={`wonder-chat-msg ${isUser ? 'wonder-chat-msg--user' : 'wonder-chat-msg--assistant'}`}>
      <div className={`wonder-chat-bubble ${isUser ? 'wonder-chat-bubble--user' : 'wonder-chat-bubble--assistant'}`}>
        {isUser ? <UserOutlined /> : <RobotOutlined />}
        {content}
      </div>
      {!isUser && sources?.chunks?.length ? (
        <div className="wonder-chat-sources">
          {sources.chunks.slice(0, 3).map((chunk, index) => (
            <div key={index} className="wonder-chat-source">
              <div className="wonder-chat-source__label">Source {index + 1}</div>
              <div className="wonder-chat-source__text">{chunk}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
