import { UserOutlined, RobotOutlined } from '@ant-design/icons'

interface Props {
  role: 'user' | 'assistant'
  content: string
  avatar?: string
  sources?: { docIds: string[]; chunks: string[] }
}

export default function ChatMessage({ role, content, avatar, sources }: Props) {
  const isUser = role === 'user'

  const avatarEl = isUser ? (
    <div className="wonder-chat-avatar">
      {avatar ? <img src={avatar} alt="头像" /> : <UserOutlined />}
    </div>
  ) : (
    <div className="wonder-chat-avatar wonder-chat-avatar--bot">
      <RobotOutlined />
    </div>
  )

  return (
    <div className={`wonder-chat-msg ${isUser ? 'wonder-chat-msg--user' : 'wonder-chat-msg--assistant'}`}>
      {!isUser && avatarEl}
      <div className="wonder-chat-bubble-wrap">
        <div className={`wonder-chat-bubble ${isUser ? 'wonder-chat-bubble--user' : 'wonder-chat-bubble--assistant'}`}>
          {content}
        </div>
        {!isUser && (
          <div className="wonder-chat-sources">
            {sources?.chunks?.length ? (
              sources.chunks.slice(0, 3).map((chunk, index) => (
                <div key={index} className="wonder-chat-source">
                  <div className="wonder-chat-source__label">Source {index + 1}</div>
                  <div className="wonder-chat-source__text">{chunk}</div>
                </div>
              ))
            ) : sources ? (
              <div className="wonder-chat-source">
                <div className="wonder-chat-source__text" style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }}>
                  无匹配的已索引来源
                </div>
              </div>
            ) : (
              <div className="wonder-chat-source">
                <div className="wonder-chat-source__text" style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }}>
                  来源未检索
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {isUser && avatarEl}
    </div>
  )
}
