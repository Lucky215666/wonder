import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, Typography, Spin, Tag, Space, Button, Empty, message } from 'antd'
import { LinkOutlined, ArrowLeftOutlined, BookOutlined, CalendarOutlined, GlobalOutlined } from '@ant-design/icons'
import { buildCitationGraph, type GraphNode, type GraphEdge } from '../lib/discovery/citation-graph'
import { getPaper } from '../lib/discovery/semantic-scholar'
import type { S2Paper } from '../lib/discovery/types'

export default function CitationNetwork() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const paperId = searchParams.get('id')

  const [loading, setLoading] = useState(false)
  const [seedPaper, setSeedPaper] = useState<S2Paper | null>(null)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [selectedRef, setSelectedRef] = useState<GraphNode | null>(null)

  useEffect(() => {
    if (!paperId) return
    setLoading(true)
    setSelectedRef(null)

    Promise.all([
      getPaper(paperId),
      buildCitationGraph(paperId, 1, 15),
    ])
      .then(([paper, graph]) => {
        setSeedPaper(paper)
        setNodes(graph.nodes)
        setEdges(graph.edges)
      })
      .catch(e => message.error(`加载失败: ${(e as Error).message}`))
      .finally(() => setLoading(false))
  }, [paperId])

  if (!paperId) {
    return (
      <div className="wonder-page">
        <div className="wonder-page-header">
          <Typography.Title level={4}>引用图谱</Typography.Title>
        </div>
        <Empty description="请从文献发现页面选择一篇论文查看引用图谱">
          <Button type="primary" onClick={() => navigate('/discovery')}>去搜索</Button>
        </Empty>
      </div>
    )
  }

  const references = edges
    .filter(e => e.from === paperId && e.type === 'references')
    .map(e => nodes.find(n => n.paperId === e.to))
    .filter(Boolean) as GraphNode[]

  const citations = edges
    .filter(e => e.to === paperId && e.type === 'citations')
    .map(e => nodes.find(n => n.paperId === e.from))
    .filter(Boolean) as GraphNode[]

  return (
    <div className="wonder-page wonder-stagger">
      <div className="wonder-page-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/discovery')} />
        <div>
          <Typography.Title level={4} style={{ marginBottom: 0 }}>引用图谱</Typography.Title>
          <Typography.Text type="secondary">追踪论文的引用关系</Typography.Text>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: 'var(--ink-faint)' }}>正在加载引用数据...</div>
        </div>
      ) : (
        <>
          {seedPaper && (
            <Card style={{ marginBottom: 16 }}>
              <Typography.Title level={5} style={{ fontFamily: 'var(--font-serif)', marginBottom: 8 }}>
                {seedPaper.title}
              </Typography.Title>
              <Space wrap style={{ marginBottom: 8 }}>
                <Tag icon={<CalendarOutlined />}>{seedPaper.year ?? '未知'}</Tag>
                <Tag icon={<GlobalOutlined />}>引用 {seedPaper.citationCount}</Tag>
              </Space>
              <div style={{ color: 'var(--ink-caption)', fontSize: 13, marginBottom: 8 }}>
                <BookOutlined style={{ marginRight: 6 }} />
                {seedPaper.authors?.map(a => a.name).join(', ') || '未知作者'}
              </div>
              {seedPaper.abstract && (
                <Typography.Paragraph ellipsis={{ rows: 3 }} style={{ marginBottom: 0, color: 'var(--ink-faint)' }}>
                  {seedPaper.abstract}
                </Typography.Paragraph>
              )}
            </Card>
          )}

          <div style={{ display: 'flex', gap: 16 }}>
            <Card title={`参考文献 (${references.length})`} style={{ flex: 1 }}>
              {references.length === 0 ? (
                <Empty description="暂无参考文献数据" />
              ) : (
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {references.map((ref) => (
                    <div
                      key={ref.paperId}
                      className="wonder-discovery-item"
                      style={{ marginBottom: 8 }}
                      onClick={() => setSelectedRef(ref)}
                    >
                      <div className="wonder-discovery-item__title">{ref.title}</div>
                      <div className="wonder-discovery-item__meta">
                        {ref.year ?? '未知'} · 引用 {ref.citationCount}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title={`被引用 (${citations.length})`} style={{ flex: 1 }}>
              {citations.length === 0 ? (
                <Empty description="暂无被引数据" />
              ) : (
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {citations.map((cit) => (
                    <div
                      key={cit.paperId}
                      className="wonder-discovery-item"
                      style={{ marginBottom: 8 }}
                      onClick={() => setSelectedRef(cit)}
                    >
                      <div className="wonder-discovery-item__title">{cit.title}</div>
                      <div className="wonder-discovery-item__meta">
                        {cit.year ?? '未知'} · 引用 {cit.citationCount}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {selectedRef && (
            <Card
              style={{ marginTop: 16 }}
              title={
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15 }}>
                  选中论文详情
                </span>
              }
              extra={
                <Space>
                  <Button
                    type="primary"
                    size="small"
                    icon={<LinkOutlined />}
                    onClick={() => navigate(`/citation?id=${selectedRef.paperId}`)}
                  >
                    查看引用图谱
                  </Button>
                  <Button size="small" onClick={() => setSelectedRef(null)}>关闭</Button>
                </Space>
              }
            >
              <Typography.Title level={5} style={{ fontFamily: 'var(--font-serif)', marginBottom: 8 }}>
                {selectedRef.title}
              </Typography.Title>
              <Space wrap>
                <Tag icon={<CalendarOutlined />}>{selectedRef.year ?? '未知'}</Tag>
                <Tag icon={<GlobalOutlined />}>引用 {selectedRef.citationCount}</Tag>
              </Space>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
