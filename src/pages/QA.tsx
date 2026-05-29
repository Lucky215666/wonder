import { useState } from 'react'
import { Card, Typography, Input, Button, Space } from 'antd'
import { SendOutlined } from '@ant-design/icons'
import { useQAStore } from '../stores/qa'
import ChatMessage from '../components/ChatMessage'

export default function QA() {
  const [input, setInput] = useState('')
  const { messages, loading, sendMessage, clear } = useQAStore()

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage(input.trim())
    setInput('')
  }

  return (
    <div>
      <Typography.Title level={4}>智能问答</Typography.Title>
      <Card style={{ height: 500, overflow: 'auto' }}>
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
      </Card>
      <Card style={{ marginTop: 16 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="输入问题..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onPressEnter={handleSend}
            disabled={loading}
          />
          <Button type="primary" icon={<SendOutlined />} onClick={handleSend} loading={loading} />
        </Space.Compact>
        <Button size="small" style={{ marginTop: 8 }} onClick={clear}>清空对话</Button>
      </Card>
    </div>
  )
}
