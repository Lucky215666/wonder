import { Typography, Card } from 'antd'
import { UserOutlined, RobotOutlined } from '@ant-design/icons'

interface Props {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatMessage({ role, content }: Props) {
  const isUser = role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
      <Card
        size="small"
        style={{
          maxWidth: '80%',
          background: isUser ? '#1890ff' : '#f5f5f5',
          color: isUser ? '#fff' : '#000',
        }}
      >
        <Typography.Text style={{ color: isUser ? '#fff' : '#000' }}>
          {isUser ? <UserOutlined /> : <RobotOutlined />} {content}
        </Typography.Text>
      </Card>
    </div>
  )
}
