import { useState, useMemo, useEffect } from 'react'
import { Card, Typography, Input, Button, Tag, Space, Empty, message, Select, Divider } from 'antd'
import { SearchOutlined, LinkOutlined, BookOutlined, CalendarOutlined, GlobalOutlined, SaveOutlined, StopOutlined, SendOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { calculateDiscoveryPriorityScore } from '../lib/discovery/ranking'
import { extractKeywords, generateSuggestedQueries } from '../lib/discovery/query-generator'
import { useDiscoveryStore } from '../stores/discovery'
import { useKnowledgeStore } from '../stores/knowledge'
import type { S2Paper } from '../lib/discovery/types'
import type { DiscoveryContext, DiscoveryCandidate } from '../types/discovery'

export default function Discovery() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<S2Paper | null>(null)

  // Context state
  const [contextMode, setContextMode] = useState<'manual' | 'knowledge_base'>('manual')
  const [manualTopic, setManualTopic] = useState('')
  const [manualKeywords, setManualKeywords] = useState('')
  const [selectedKBId, setSelectedKBId] = useState<string | null>(null)

  const {
    discoveryContext, setDiscoveryContext,
    searchResults, searchLoading, hasSearched, searchPapers,
    candidateQueue, loadCandidates, saveCandidate,
    updateCandidateState, isInQueue, getCandidate,
  } = useDiscoveryStore()

  const { knowledgeBases, loadKnowledgeBases } = useKnowledgeStore()

  useEffect(() => { loadKnowledgeBases() }, [loadKnowledgeBases])
  useEffect(() => { loadCandidates() }, [loadCandidates])

  const suggestedQueries = useMemo(() => {
    if (!discoveryContext) return []
    return generateSuggestedQueries(discoveryContext)
  }, [discoveryContext])

  const rankedResults = useMemo(() => {
    if (!discoveryContext || discoveryContext.keywords.length === 0) {
      return searchResults.map(paper => ({ paper, score: 0, reason: '无上下文排名' }))
    }
    return searchResults
      .map(paper => {
        const ranking = calculateDiscoveryPriorityScore(paper, discoveryContext.keywords)
        return { paper, score: ranking.score, reason: ranking.reason }
      })
      .sort((a, b) => b.score - a.score)
  }, [searchResults, discoveryContext])

  const handleSetContext = () => {
    if (contextMode === 'manual') {
      if (!manualTopic.trim()) { message.warning('请输入研究主题'); return }
      const keywords = manualKeywords.split(/[,，、\s]+/).map(k => k.trim()).filter(Boolean)
      setDiscoveryContext({
        mode: 'manual',
        name: manualTopic.trim(),
        keywords: keywords.length > 0 ? keywords : [manualTopic.trim()],
      })
      message.success('已设置发现上下文')
    } else {
      if (!selectedKBId) { message.warning('请选择知识库'); return }
      const kb = knowledgeBases.find(k => k.id === selectedKBId)
      if (!kb) return
      const keywords = extractKeywords(kb.readme || '')
      setDiscoveryContext({
        mode: 'knowledge_base',
        knowledgeBaseId: selectedKBId,
        name: kb.name,
        readme: kb.readme,
        keywords,
      })
      loadCandidates(selectedKBId)
      message.success(`已从「${kb.name}」提取 ${keywords.length} 个关键词`)
    }
  }

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery || query
    if (!q.trim()) return
    setQuery(q)
    await searchPapers(q, 20)
    const latest = useDiscoveryStore.getState().searchResults
    if (latest.length > 0) setSelected(latest[0])
    else setSelected(null)
  }

  const handleSaveCandidate = (paper: S2Paper) => {
    if (!discoveryContext) { message.warning('请先设置发现上下文'); return }
    const ranking = calculateDiscoveryPriorityScore(paper, discoveryContext.keywords)
    saveCandidate({
      paperId: paper.paperId,
      title: paper.title,
      abstract: paper.abstract,
      year: paper.year,
      citationCount: paper.citationCount,
      influentialCitationCount: paper.influentialCitationCount,
      venue: paper.venue,
      authors: paper.authors,
      url: paper.url,
      sourceQuery: query,
      discoveryPriorityScore: ranking.score,
      discoveryReason: ranking.reason,
      state: 'saved',
      knowledgeBaseId: discoveryContext.knowledgeBaseId ?? null,
    })
    message.success('已保存到候选队列')
  }

  const handleIgnoreCandidate = (paper: S2Paper) => {
    if (!discoveryContext) { message.warning('请先设置发现上下文'); return }
    const ranking = calculateDiscoveryPriorityScore(paper, discoveryContext.keywords)
    saveCandidate({
      paperId: paper.paperId,
      title: paper.title,
      abstract: paper.abstract,
      year: paper.year,
      citationCount: paper.citationCount,
      influentialCitationCount: paper.influentialCitationCount,
      venue: paper.venue,
      authors: paper.authors,
      url: paper.url,
      sourceQuery: query,
      discoveryPriorityScore: ranking.score,
      discoveryReason: ranking.reason,
      state: 'ignored',
      knowledgeBaseId: discoveryContext.knowledgeBaseId ?? null,
    })
    message.info('已忽略该论文')
  }

  const handlePrepareForAnalysis = (paper: S2Paper) => {
    if (!discoveryContext) { message.warning('请先设置发现上下文'); return }
    const ranking = calculateDiscoveryPriorityScore(paper, discoveryContext.keywords)
    const candidate = getCandidate(paper.paperId)
    const candidateId = candidate?.id
    // Save as candidate first if not already in queue
    if (!candidate) {
      saveCandidate({
        paperId: paper.paperId,
        title: paper.title,
        abstract: paper.abstract,
        year: paper.year,
        citationCount: paper.citationCount,
        influentialCitationCount: paper.influentialCitationCount,
        venue: paper.venue,
        authors: paper.authors,
        url: paper.url,
        sourceQuery: query,
        discoveryPriorityScore: ranking.score,
        discoveryReason: ranking.reason,
        state: 'sent_to_analysis',
        knowledgeBaseId: discoveryContext.knowledgeBaseId ?? null,
      })
    } else if (candidateId) {
      updateCandidateState(candidateId, 'sent_to_analysis')
    }
    // Navigate with URL params
    const params = new URLSearchParams()
    if (candidateId) params.set('candidateId', candidateId)
    if (discoveryContext.knowledgeBaseId) params.set('kb', discoveryContext.knowledgeBaseId)
    navigate(`/analysis?${params.toString()}`)
    message.success('已准备分析载荷，可前往分析页面')
  }

  const getCandidateStateTag = (paperId: string) => {
    const candidate = getCandidate(paperId)
    if (!candidate) return null
    const stateMap: Record<string, { color: string; text: string }> = {
      new: { color: 'blue', text: '新' },
      saved: { color: 'green', text: '已保存' },
      ignored: { color: 'default', text: '已忽略' },
      sent_to_analysis: { color: 'purple', text: '已发送分析' },
    }
    const state = stateMap[candidate.state] ?? stateMap.new
    return <Tag color={state.color}>{state.text}</Tag>
  }

  return (
    <div className="wonder-page wonder-discovery-page">
      <div className="wonder-page-header">
        <Typography.Title level={4}>文献发现</Typography.Title>
        <Typography.Text type="secondary">搜索学术论文，发现研究前沿</Typography.Text>
      </div>

      {/* Context Selection */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>发现上下文</Typography.Text>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select
            value={contextMode}
            onChange={setContextMode}
            style={{ width: 200 }}
            options={[
              { value: 'manual', label: '手动输入' },
              { value: 'knowledge_base', label: '知识库' },
            ]}
          />

          {contextMode === 'manual' ? (
            <Space style={{ width: '100%' }}>
              <Input
                placeholder="研究主题"
                value={manualTopic}
                onChange={e => setManualTopic(e.target.value)}
                style={{ width: 200 }}
              />
              <Input
                placeholder="关键词（逗号分隔）"
                value={manualKeywords}
                onChange={e => setManualKeywords(e.target.value)}
                style={{ width: 300 }}
              />
              <Button type="primary" onClick={handleSetContext}>设置</Button>
            </Space>
          ) : (
            <Space style={{ width: '100%' }}>
              <Select
                placeholder="选择知识库"
                value={selectedKBId}
                onChange={setSelectedKBId}
                style={{ width: 300 }}
                options={knowledgeBases.map(kb => ({ value: kb.id, label: kb.name }))}
                allowClear
              />
              <Button type="primary" onClick={handleSetContext}>使用知识库上下文</Button>
            </Space>
          )}

          {discoveryContext && (
            <Space wrap>
              <Tag color="blue">主题: {discoveryContext.name}</Tag>
              {discoveryContext.keywords.slice(0, 5).map(kw => (
                <Tag key={kw}>{kw}</Tag>
              ))}
            </Space>
          )}
        </Space>
      </Card>

      {/* Search with suggested queries */}
      <div className="wonder-discovery-search">
        <Input.Search
          placeholder="搜索论文标题、关键词..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onSearch={() => handleSearch()}
          enterButton={<><SearchOutlined /> 搜索</>}
          loading={searchLoading}
          size="large"
        />
        {suggestedQueries.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>建议查询:</Typography.Text>
            {suggestedQueries.map((sq, idx) => (
              <Tag key={idx} style={{ cursor: 'pointer', marginBottom: 4 }} onClick={() => handleSearch(sq)}>
                {sq}
              </Tag>
            ))}
          </div>
        )}
      </div>

      <div className="wonder-discovery-layout">
        <div className="wonder-discovery-sidebar">
          {rankedResults.length === 0 && !searchLoading ? (
            <Empty
              description={<span style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-serif)' }}>{hasSearched ? '未找到相关论文，请尝试其他关键词' : '输入关键词开始搜索'}</span>}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 300 }}
            />
          ) : (
            rankedResults.map(({ paper, score, reason }) => (
              <div
                key={paper.paperId}
                className={`wonder-discovery-item ${selected?.paperId === paper.paperId ? 'wonder-discovery-item--selected' : ''}`}
                onClick={() => setSelected(paper)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="wonder-discovery-item__title" style={{ flex: 1 }}>{paper.title}</div>
                  {discoveryContext && (
                    <div style={{ marginLeft: 8, textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-primary)' }}>{score}</div>
                      <div style={{ fontSize: 10, color: 'var(--ink-faint)' }}>优先级</div>
                    </div>
                  )}
                </div>
                <div className="wonder-discovery-item__meta">
                  <Space size={4}>
                    <CalendarOutlined /> {paper.year ?? '未知'}
                    <span style={{ margin: '0 4px' }}>·</span>
                    引用 {paper.citationCount}
                    {getCandidateStateTag(paper.paperId)}
                  </Space>
                </div>
                {discoveryContext && (
                  <div style={{ fontSize: 11, color: 'var(--ink-caption)', marginTop: 4 }}>{reason}</div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="wonder-discovery-main">
          {selected ? (
            <Card>
              <Typography.Title level={5} style={{ fontFamily: 'var(--font-serif)', marginBottom: 12 }}>
                {selected.title}
              </Typography.Title>
              <Space wrap style={{ marginBottom: 16 }}>
                <Tag icon={<CalendarOutlined />}>{selected.year ?? '未知'}</Tag>
                <Tag icon={<GlobalOutlined />}>引用 {selected.citationCount}</Tag>
                {(selected.influentialCitationCount ?? 0) > 0 && (
                  <Tag color="gold">高影响力 {selected.influentialCitationCount}</Tag>
                )}
                {discoveryContext && (
                  <Tag color="blue">优先级: {calculateDiscoveryPriorityScore(selected, discoveryContext.keywords).score}</Tag>
                )}
                {getCandidateStateTag(selected.paperId)}
              </Space>
              <div style={{ marginBottom: 16, color: 'var(--ink-caption)', fontSize: 13 }}>
                <BookOutlined style={{ marginRight: 6 }} />
                {selected.authors?.map(a => a.name).join(', ') || '未知作者'}
              </div>
              {selected.abstract && (
                <div style={{
                  background: 'var(--bg)', border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: 20,
                  fontFamily: 'var(--font-serif)', fontSize: 14, lineHeight: 1.8, color: 'var(--ink-secondary)',
                }}>
                  {selected.abstract}
                </div>
              )}

              <Divider style={{ margin: '16px 0' }} />

              <Space wrap>
                {!isInQueue(selected.paperId) ? (
                  <>
                    <Button type="primary" icon={<SaveOutlined />} onClick={() => handleSaveCandidate(selected)} disabled={!discoveryContext}>
                      保存候选
                    </Button>
                    <Button icon={<StopOutlined />} onClick={() => handleIgnoreCandidate(selected)} disabled={!discoveryContext}>
                      忽略
                    </Button>
                  </>
                ) : (
                  <Tag color="green" style={{ padding: '4px 8px' }}>已在候选队列中</Tag>
                )}
                <Button icon={<LinkOutlined />} onClick={() => navigate(`/citation?id=${selected.paperId}`)}>
                  查看引用图谱
                </Button>
                <Button icon={<SendOutlined />} onClick={() => handlePrepareForAnalysis(selected)} disabled={!discoveryContext}>
                  准备分析
                </Button>
                {selected.url && (
                  <Button icon={<GlobalOutlined />} href={selected.url} target="_blank">原文链接</Button>
                )}
              </Space>
            </Card>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--ink-ghost)' }}>
              <Empty description="选择一篇论文查看详情" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
