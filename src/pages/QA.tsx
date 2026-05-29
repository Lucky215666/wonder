import { useState, useRef, useEffect } from 'react'
import { Card, Typography, Input, Button } from 'antd'
import { SendOutlined, DeleteOutlined, ExperimentOutlined } from '@ant-design/icons'
import { useQAStore } from '../stores/qa'
import ChatMessage from '../components/ChatMessage'
import ApiGuard from '../components/ApiGuard'

export default function QA() {
  const [input, setInput] = useState('')
  const { messages, loading, sendMessage, clear } = useQAStore()
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage(input.trim())
    setInput('')
  }

  return (
    <ApiGuard require="analysis">
    <div className="wonder-page wonder-stagger">
      <div className="wonder-page-header">
        <Typography.Title level={4}>追溯问答</Typography.Title>
        <Typography.Text type="secondary">基于知识库的智能问答</Typography.Text>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div
          ref={listRef}
          style={{ height: 460, overflowY: 'auto', padding: '4px 0' }}
        >
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--ink-ghost)' }}>
              <ExperimentOutlined style={{ fontSize: 48, marginBottom: 16, display: 'block' }} />
              <Typography.Text style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-serif)', fontSize: 15 }}>
                输入问题，AI 将基于知识库为你解答
              </Typography.Text>
            </div>
          )}
          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
          ))}
        </div>
      </Card>

      <Card style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            placeholder="输入问题..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onPressEnter={handleSend}
            disabled={loading}
            size="large"
            style={{ flex: 1 }}
          />
          <Button type="primary" icon={<SendOutlined />} onClick={handleSend} loading={loading} size="large" />
        </div>
        <div style={{ marginTop: 8, textAlign: 'right' }}>
          <Button size="small" icon={<DeleteOutlined />} onClick={clear} type="text" style={{ color: 'var(--ink-faint)' }}>
            清空对话
          </Button>
        </div>
      </Card>
    </div>
    </ApiGuard>
  )
}
