import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Typography, Spin, Button } from 'antd'
import { ArrowLeftOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { api } from '../services/api'

export default function HistoryDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<{ id: string; created_at: string; result: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      api.get<{ id: string; created_at: string; result: string }>(`/api/history/${id}`)
        .then(setData)
        .finally(() => setLoading(false))
    }
  }, [id])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="wonder-page">
        <Typography.Text style={{ color: 'var(--ink-faint)' }}>记录不存在</Typography.Text>
      </div>
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(data.result)
  } catch {
    parsed = data.result
  }

  return (
    <div className="wonder-page wonder-stagger">
      <div className="wonder-page-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/history')} />
        <div>
          <Typography.Title level={4} style={{ marginBottom: 0 }}>分析详情</Typography.Title>
          <Typography.Text type="secondary">
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {new Date(data.created_at).toLocaleString('zh-CN')}
          </Typography.Text>
        </div>
      </div>

      <Card>
        <pre style={{
          whiteSpace: 'pre-wrap',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          lineHeight: 1.6,
          color: 'var(--ink-secondary)',
          background: 'var(--bg)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-light)',
          maxHeight: 600,
          overflow: 'auto',
        }}>
          {JSON.stringify(parsed, null, 2)}
        </pre>
      </Card>
    </div>
  )
}
