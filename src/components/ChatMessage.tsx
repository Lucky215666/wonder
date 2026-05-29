import { UserOutlined, RobotOutlined } from '@ant-design/icons'

interface Props {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatMessage({ role, content }: Props) {
  const isUser = role === 'user'

  return (
    <div className={`wonder-chat-msg ${isUser ? 'wonder-chat-msg--user' : 'wonder-chat-msg--assistant'}`}>
      <div className={`wonder-chat-bubble ${isUser ? 'wonder-chat-bubble--user' : 'wonder-chat-bubble--assistant'}`}>
        {isUser ? <UserOutlined /> : <RobotOutlined />}
        {content}
      </div>
    </div>
  )
}
