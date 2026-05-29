import { useState } from 'react'
import { Card, Typography, Upload, Button, Table, Progress, message } from 'antd'
import { InboxOutlined, PlayCircleOutlined } from '@ant-design/icons'

interface BatchItem {
  key: string
  fileName: string
  status: 'pending' | 'running' | 'done' | 'error'
  progress: number
}

export default function Batch() {
  const [items, setItems] = useState<BatchItem[]>([])
  const [running, setRunning] = useState(false)

  const handleUpload = (files: FileList | null) => {
    if (!files) return
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

  const columns = [
    { title: '文件名', dataIndex: 'fileName', key: 'fileName' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => ({ pending: '待处理', running: '分析中', done: '已完成', error: '失败' }[s]),
    },
    { title: '进度', dataIndex: 'progress', key: 'progress', render: (p: number) => <Progress percent={p} size="small" /> },
  ]

  return (
    <div>
      <Typography.Title level={4}>批量分析</Typography.Title>
      <Card>
        <Upload.Dragger
          multiple
          accept=".pdf,.docx,.txt,.md"
          beforeUpload={(file) => {
            handleUpload([file] as unknown as FileList)
            return false
          }}
          showUploadList={false}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">拖拽多个文件到此处</p>
        </Upload.Dragger>
        <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleStart} loading={running} disabled={items.length === 0} style={{ marginTop: 16 }}>
          开始批量分析
        </Button>
      </Card>
      <Card style={{ marginTop: 16 }}>
        <Table columns={columns} dataSource={items} pagination={false} />
      </Card>
    </div>
  )
}
