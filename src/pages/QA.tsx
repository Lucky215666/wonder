import { useState, useRef, useEffect } from 'react'
import { Card, Typography, Input, Button, List, Modal, Select, Space, Empty, Popconfirm, Tag, message } from 'antd'
import {
  SendOutlined, DeleteOutlined, ExperimentOutlined,
  PlusOutlined, MessageOutlined, BookOutlined, FileTextOutlined,
  GlobalOutlined, LoadingOutlined, RobotOutlined,
} from '@ant-design/icons'
import { useQAStore } from '../stores/qa'
import { useConfigStore } from '../stores/config'
import ChatMessage from '../components/ChatMessage'
import ApiGuard from '../components/ApiGuard'
import KBSelector from '../components/KBSelector'

const SCOPE_OPTIONS = [
  { label: '知识库', value: 'knowledge_base', icon: <BookOutlined /> },
  { label: '指定文档', value: 'document', icon: <FileTextOutlined /> },
  { label: '全部', value: 'all', icon: <GlobalOutlined /> },
]

export default function QA() {
  const [input, setInput] = useState('')
  const [showNewSession, setShowNewSession] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newScopeType, setNewScopeType] = useState('knowledge_base')
  const [newScopeIds, setNewScopeIds] = useState<string[]>([])
  const listRef = useRef<HTMLDivElement>(null)

  const {
    sessions, sessionsLoading, sessionId, messages, loading,
    loadSessions, createSession, openSession, deleteSession, sendMessage, clear,
  } = useQAStore()
  const { config } = useConfigStore()

  useEffect(() => { loadSessions() }, [loadSessions])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return
    const question = input.trim()
    setInput('')
    try {
      await sendMessage(question)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '发送失败，请检查网络或 API 配置')
    }
  }

  const handleCreateSession = async () => {
    if (!newTitle.trim()) return
    try {
      await createSession(newTitle.trim(), newScopeType, newScopeIds)
      setShowNewSession(false)
      setNewTitle('')
      setNewScopeType('knowledge_base')
      setNewScopeIds([])
    } catch {
      message.error('创建会话失败，请重试')
    }
  }

  const scopeLabel = (type: string) => {
    switch (type) {
      case 'knowledge_base': return <Tag icon={<BookOutlined />} color="blue">知识库</Tag>
      case 'document': return <Tag icon={<FileTextOutlined />} color="cyan">文档</Tag>
      default: return <Tag icon={<GlobalOutlined />} color="default">全部</Tag>
    }
  }

  return (
    <ApiGuard require="both">
    <div className="wonder-page wonder-stagger">
      <div className="wonder-page-header">
        <Typography.Title level={4}>追溯问答</Typography.Title>
        <Typography.Text type="secondary">基于知识库的智能研究助手</Typography.Text>
      </div>

      <div style={{ display: 'flex', gap: 16, minHeight: 500 }}>
        {/* Session sidebar */}
        <Card
          size="small"
          style={{ width: 260, flexShrink: 0 }}
          title={<span style={{ fontSize: 14 }}>会话列表</span>}
          extra={
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setShowNewSession(true)}
            />
          }
          bodyStyle={{ padding: 0, maxHeight: 460, overflowY: 'auto' }}
        >
          {sessionsLoading && sessions.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-ghost)' }}>加载中...</div>
          ) : sessions.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span style={{ color: 'var(--ink-faint)', fontSize: 13 }}>暂无会话</span>}
              style={{ padding: '24px 0' }}
            />
          ) : (
            <List
              dataSource={sessions}
              renderItem={item => (
                <List.Item
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    background: sessionId === item.id ? 'var(--accent-ghost)' : undefined,
                    borderBottom: '1px solid var(--border-light)',
                  }}
                  onClick={() => openSession(item.id)}
                  actions={[
                    <Popconfirm
                      key="del"
                      title="确定删除此会话？"
                      onConfirm={(e) => { e?.stopPropagation(); deleteSession(item.id) }}
                      onCancel={(e) => e?.stopPropagation()}
                    >
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<MessageOutlined style={{ color: sessionId === item.id ? 'var(--accent)' : 'var(--ink-ghost)' }} />}
                    title={<span style={{ fontSize: 13, fontWeight: sessionId === item.id ? 600 : 400 }}>{item.title}</span>}
                    description={scopeLabel(item.scope_type)}
                  />
                </List.Item>
              )}
            />
          )}
        </Card>

        {/* Chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {!sessionId ? (
            <Card style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty
                image={<ExperimentOutlined style={{ fontSize: 48, color: 'var(--ink-ghost)' }} />}
                description={
                  <span style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-serif)' }}>
                    创建或选择一个会话开始问答
                  </span>
                }
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowNewSession(true)}>
                  新建会话
                </Button>
              </Empty>
            </Card>
          ) : (
            <>
              <Card style={{ flex: 1, marginBottom: 12, display: 'flex', flexDirection: 'column' }}>
                <div
                  ref={listRef}
                  style={{ flex: 1, overflowY: 'auto', padding: '4px 0', minHeight: 350 }}
                >
                  {messages.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--ink-ghost)' }}>
                      <ExperimentOutlined style={{ fontSize: 48, marginBottom: 16, display: 'block' }} />
                      <Typography.Text style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-serif)', fontSize: 15 }}>
                        输入问题开始对话
                      </Typography.Text>
                    </div>
                  )}
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} role={msg.role} content={msg.content} avatar={msg.role === 'user' ? config?.avatar : undefined} sources={msg.sources} />
                  ))}
                  {loading && (
                    <div className="wonder-chat-msg wonder-chat-msg--assistant">
                      <div className="wonder-chat-avatar wonder-chat-avatar--bot">
                        <RobotOutlined />
                      </div>
                      <div className="wonder-chat-bubble-wrap">
                        <div className="wonder-chat-bubble wonder-chat-bubble--assistant">
                          <LoadingOutlined /> 正在思考...
                        </div>
                      </div>
                    </div>
                  )}
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
                    关闭会话
                  </Button>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* New session modal */}
      <Modal
        title="新建会话"
        open={showNewSession}
        onOk={handleCreateSession}
        onCancel={() => setShowNewSession(false)}
        okButtonProps={{ disabled: !newTitle.trim() }}
        okText="创建"
        cancelText="取消"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 13, marginBottom: 4, display: 'block' }}>会话标题</Typography.Text>
            <Input
              placeholder="例如：RAG 方法调研"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onPressEnter={handleCreateSession}
            />
          </div>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 13, marginBottom: 4, display: 'block' }}>作用域</Typography.Text>
            <Select
              value={newScopeType}
              onChange={setNewScopeType}
              options={SCOPE_OPTIONS}
              style={{ width: '100%' }}
            />
          </div>
          {newScopeType === 'knowledge_base' && (
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 13, marginBottom: 4, display: 'block' }}>选择知识库</Typography.Text>
              <KBSelector
                value={newScopeIds[0] || null}
                onChange={(v) => setNewScopeIds(v ? [v] : [])}
                style={{ width: '100%' }}
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
    </ApiGuard>
  )
}
