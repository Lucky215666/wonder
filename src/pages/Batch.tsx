import { useState } from 'react'
import { Card, Typography, Button, Progress, Empty, message } from 'antd'
import { InboxOutlined, PlayCircleOutlined, FileTextOutlined, CheckCircleOutlined, LoadingOutlined, CloseCircleOutlined } from '@ant-design/icons'
import ApiGuard from '../components/ApiGuard'

interface BatchItem {
  key: string
  fileName: string
  status: 'pending' | 'running' | 'done' | 'error'
  progress: number
}

export default function Batch() {
  const [items, setItems] = useState<BatchItem[]>([])
  const [running, setRunning] = useState(false)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const files = e.dataTransfer.files
    if (!files.length) return
    addFiles(files)
  }

  const addFiles = (files: FileList) => {
    const newItems: BatchItem[] = Array.from(files).map((f, i) => ({
      key: `${Date.now()}-${i}`,
      fileName: f.name,
      status: 'pending' as const,
      progress: 0,
    }))
    setItems(prev => [...prev, ...newItems])
  }

  const handleStart = async () => {
    setRunning(true)
    for (const item of items) {
      if (item.status !== 'pending') continue
      setItems(prev => prev.map(i => i.key === item.key ? { ...i, status: 'running' } : i))
      await new Promise(r => setTimeout(r, 1000))
      setItems(prev => prev.map(i => i.key === item.key ? { ...i, status: 'done', progress: 100 } : i))
    }
    setRunning(false)
    message.success('批量分析完成')
  }

  const statusIcon = (status: BatchItem['status']) => {
    switch (status) {
      case 'pending': return <FileTextOutlined style={{ color: 'var(--ink-ghost)' }} />
      case 'running': return <LoadingOutlined style={{ color: 'var(--accent)' }} />
      case 'done': return <CheckCircleOutlined style={{ color: 'var(--success)' }} />
      case 'error': return <CloseCircleOutlined style={{ color: 'var(--danger)' }} />
    }
  }

  const statusText = (status: BatchItem['status']) => {
    switch (status) {
      case 'pending': return '待处理'
      case 'running': return '分析中...'
      case 'done': return '已完成'
      case 'error': return '失败'
    }
  }

  return (
    <ApiGuard require="analysis">
    <div className="wonder-page wonder-stagger">
      <div className="wonder-page-header">
        <Typography.Title level={4}>批量分析</Typography.Title>
        <Typography.Text type="secondary">同时分析多个文档，提高研究效率</Typography.Text>
      </div>

      <div
        className={`wonder-upload-zone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => {
          const input = document.createElement('input')
          input.type = 'file'
          input.multiple = true
          input.accept = '.pdf,.docx,.txt,.md'
          input.onchange = () => input.files && addFiles(input.files)
          input.click()
        }}
      >
        <div className="wonder-upload-icon"><InboxOutlined /></div>
        <div className="wonder-upload-text">拖拽多个文件到此处</div>
        <div className="wonder-upload-hint">支持 PDF、DOCX、TXT、Markdown 格式</div>
      </div>

      {items.length > 0 && (
        <Card style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Typography.Text style={{ color: 'var(--ink-caption)', fontSize: 13 }}>
              共 {items.length} 个文件，已完成 {items.filter(i => i.status === 'done').length} 个
            </Typography.Text>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleStart}
              loading={running}
              disabled={items.every(i => i.status !== 'pending')}
            >
              开始批量分析
            </Button>
          </div>

          <div>
            {items.map((item) => (
              <div key={item.key} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 12px',
                borderBottom: '1px solid var(--border-light)',
                gap: 12,
              }}>
                {statusIcon(item.status)}
                <span style={{ flex: 1, color: 'var(--ink-secondary)', fontSize: 14 }}>{item.fileName}</span>
                <span style={{
                  color: item.status === 'done' ? 'var(--success)' : item.status === 'running' ? 'var(--accent)' : 'var(--ink-faint)',
                  fontSize: 13,
                  fontWeight: item.status === 'running' ? 500 : 400,
                }}>
                  {statusText(item.status)}
                </span>
                {item.status === 'running' && (
                  <Progress percent={item.progress} size="small" style={{ width: 100, margin: 0 }} />
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {items.length === 0 && (
        <Empty
          description={
            <span style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-serif)' }}>
              拖拽文件到上方区域开始批量分析
            </span>
          }
          style={{ marginTop: 40 }}
        />
      )}
    </div>
    </ApiGuard>
  )
}
