import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Typography, Button, Empty } from 'antd'
import { FileTextOutlined, RightOutlined, HistoryOutlined } from '@ant-design/icons'
import { useHistoryStore } from '../stores/history'

export default function History() {
  const navigate = useNavigate()
  const { items, loading, loadHistory } = useHistoryStore()

  useEffect(() => { loadHistory() }, [loadHistory])

  const list = items as { id: string; created_at: string; result: string }[]

  return (
    <div className="wonder-page wonder-stagger">
      <div className="wonder-page-header">
        <Typography.Title level={4}>历史记录</Typography.Title>
        <Typography.Text type="secondary">查看过往分析结果</Typography.Text>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-faint)' }}>
          加载中...
        </div>
      ) : list.length === 0 ? (
        <Empty
          description={
            <span style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-serif)' }}>
              暂无历史记录
            </span>
          }
        >
          <Button type="primary" onClick={() => navigate('/')}>去分析</Button>
        </Empty>
      ) : (
        <div>
          {list.map((item) => (
            <div
              key={item.id}
              className="wonder-history-card"
              onClick={() => navigate(`/history/${item.id}`)}
            >
              <FileTextOutlined />
              <div>
                <div className="wonder-history-card__title">
                  分析记录 {item.id.slice(0, 8)}
                </div>
                <div className="wonder-history-card__meta">
                  {new Date(item.created_at).toLocaleString('zh-CN')}
                </div>
              </div>
              <div className="wonder-history-card__actions">
                <Button type="text" size="small" icon={<RightOutlined />} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
