import { UserOutlined, RobotOutlined, FileTextOutlined } from '@ant-design/icons'
import { Tag } from 'antd'

interface SourceRef {
  doc_id: string
  file_name: string
  chunk_id?: string | null
  chunk_index?: number | null
  chunk_type: 'summary' | 'content'
  content: string
  score?: number | null
}

type AnswerMode = 'general' | 'rag_enhanced' | 'mentioned_docs' | 'compare_docs'

interface QASources {
  docIds: string[]
  chunks: string[]
  refs?: SourceRef[]
  answerMode?: AnswerMode
}

interface Props {
  role: 'user' | 'assistant'
  content: string
  avatar?: string
  sources?: QASources
}

const ANSWER_MODE_LABELS: Record<AnswerMode, { label: string; color: string }> = {
  general: { label: '通用回答', color: 'default' },
  rag_enhanced: { label: '基于知识库', color: 'blue' },
  mentioned_docs: { label: '基于指定文档', color: 'cyan' },
  compare_docs: { label: '文档对比', color: 'purple' },
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

  const modeInfo = sources?.answerMode ? ANSWER_MODE_LABELS[sources.answerMode] : null

  return (
    <div className={`wonder-chat-msg ${isUser ? 'wonder-chat-msg--user' : 'wonder-chat-msg--assistant'}`}>
      {!isUser && avatarEl}
      <div className="wonder-chat-bubble-wrap">
        <div className={`wonder-chat-bubble ${isUser ? 'wonder-chat-bubble--user' : 'wonder-chat-bubble--assistant'}`}>
          {content}
        </div>
        {!isUser && (
          <div className="wonder-chat-sources">
            {modeInfo && (
              <div style={{ marginBottom: 6 }}>
                <Tag color={modeInfo.color} style={{ fontSize: 12 }}>{modeInfo.label}</Tag>
              </div>
            )}
            {sources?.refs?.length ? (
              sources.refs.slice(0, 5).map((ref, index) => (
                <div key={ref.chunk_id || index} className="wonder-chat-source">
                  <div className="wonder-chat-source__label">
                    <FileTextOutlined style={{ marginRight: 4 }} />
                    {ref.file_name}
                    {ref.chunk_index != null && (
                      <span style={{ color: 'var(--ink-ghost)', marginLeft: 6 }}>
                        #{ref.chunk_index}
                      </span>
                    )}
                    {ref.score != null && (
                      <span style={{ color: 'var(--ink-ghost)', marginLeft: 6, fontSize: 11 }}>
                        {(ref.score * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <div className="wonder-chat-source__text">
                    {ref.content.length > 200 ? ref.content.slice(0, 200) + '...' : ref.content}
                  </div>
                </div>
              ))
            ) : sources?.chunks?.length ? (
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
