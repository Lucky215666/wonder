import { useEffect, useState } from 'react'
import { Card, Typography, Alert, Button, Spin, message, Tag, Space } from 'antd'
import { ReloadOutlined, CheckCircleOutlined, BookOutlined, CalendarOutlined, GlobalOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'
import FileUpload from '../components/FileUpload'
import StepProgress from '../components/StepProgress'
import ApiGuard from '../components/ApiGuard'
import KBSelector from '../components/KBSelector'
import AnalysisResult from '../components/AnalysisResult'
import { useAnalysisStore } from '../stores/analysis'
import { useKnowledgeStore } from '../stores/knowledge'
import { api } from '../services/api'
import type { AnalysisResult as AnalysisResultType } from '../types/analysis'

interface CandidateInfo {
  id: string
  paper_id: string
  title: string
  abstract: string | null
  year: number | null
  authors: string | null
  url: string | null
  knowledge_base_id: string | null
}

/**
 * Normalize Python backend snake_case output to the camelCase AnalysisResult type.
 * Also handles the legacy nested { literature, relation, writing } format.
 */
function normalizeAnalysisResult(raw: Record<string, unknown>): AnalysisResultType {
  // Legacy nested format
  if (raw && typeof raw === 'object' && 'literature' in raw && typeof raw.literature === 'object' && raw.literature) {
    const lit = raw.literature as Record<string, unknown>
    const rel = (raw.relation || {}) as Record<string, unknown>
    const wri = (raw.writing || {}) as Record<string, unknown>
    return {
      summary: (lit.summary as string) || '',
      paperTitle: (raw.paperTitle as string) || (raw.paper_title as string) || undefined,
      readingCard: (lit.readingCard as string) || '',
      knowledgeBaseFitScore: lit.fitScore as number | undefined,
      fitReason: lit.fitReason as string | undefined,
      recommendedAction: lit.action as AnalysisResultType['recommendedAction'],
      tags: lit.tags as string[] | undefined,
      relationToExistingDocs: rel.relationToExistingDocs as AnalysisResultType['relationToExistingDocs'],
      relationAnalysis: rel.relationAnalysis as string | undefined,
      writingAssets: wri.writingAssets as AnalysisResultType['writingAssets'],
      writingMaterials: wri.writingMaterials as string | undefined,
      readmeUpdateSuggestions: raw.readmeSuggestions as AnalysisResultType['readmeUpdateSuggestions'],
      todoList: (raw.todo_list as string) || (lit.todoList as string) || undefined,
      matchScore: lit.matchScore as number | undefined,
      matchReason: lit.matchReason as string | undefined,
    }
  }

  // Flat format — supports both snake_case (Python direct) and camelCase (SSE complete event)
  const fitScore = (raw.fit_score as number) ?? (raw.knowledgeBaseFitScore as number) ?? undefined
  const fitReason = (raw.fit_reason as string) || (raw.fitReason as string) || undefined
  const relationType = (raw.relation_type as string) || (raw.relationType as string) || undefined

  return {
    summary: (raw.summary as string) || '',
    paperTitle: (raw.paperTitle as string) || (raw.paper_title as string) || undefined,
    readingCard: (raw.reading_card as string) || (raw.readingCard as string) || '',
    knowledgeBaseFitScore: fitScore,
    fitReason,
    relationToExistingDocs: relationType ? {
      type: relationType as AnalysisResultType['relationToExistingDocs'] extends { type: infer T } ? T : never,
      reason: fitReason || '',
      relatedDocumentIds: [],
    } : undefined,
    relationAnalysis: (raw.relation_analysis as string) || (raw.relationAnalysis as string) || undefined,
    writingMaterials: (raw.writing_materials as string) || (raw.writingMaterials as string) || undefined,
    todoList: (raw.todo_list as string) || (raw.todoList as string) || undefined,
    matchScore: fitScore,
    matchReason: fitReason,
    tags: raw.tags as string[] | undefined,
    recommendedAction: (raw.recommended_action as string) || (raw.recommendedAction as string) || undefined,
    suggestedPlacement: (raw.suggestedPlacement as AnalysisResultType['suggestedPlacement'])
      || (raw.suggested_placement ? {
        subDirection: (raw.suggested_placement as { sub_direction: string; tags: string[] }).sub_direction || '',
        tags: (raw.suggested_placement as { sub_direction: string; tags: string[] }).tags || [],
      } : undefined),
    noveltyForKnowledgeBase: (raw.noveltyForKnowledgeBase as string) || (raw.novelty_for_kb as string) || undefined,
    readmeUpdateSuggestions: (raw.readmeUpdateSuggestions as AnalysisResultType['readmeUpdateSuggestions'])
      || (raw.readme_suggestions as AnalysisResultType['readmeUpdateSuggestions']) || undefined,
    writingAssets: (raw.writingAssets as AnalysisResultType['writingAssets'])
      || (raw.writing_assets ? {
        usableClaims: (raw.writing_assets as { usable_claims: string[] }).usable_claims || [],
        methodReferences: (raw.writing_assets as { method_references: string[] }).method_references || [],
        theoryReferences: (raw.writing_assets as { theory_references: string[] }).theory_references || [],
        possibleLiteratureReviewUse: (raw.writing_assets as { possible_literature_review_use: string }).possible_literature_review_use || '',
        limitationsOrCritique: (raw.writing_assets as { limitations_or_critique: string }).limitations_or_critique || '',
      } : undefined),
  } as AnalysisResultType
}

export default function Analysis() {
  const [searchParams] = useSearchParams()
  const {
    steps, documentId, knowledgeBaseId, running,
    apiStatus, apiError,
    analyze, reset, cancel, checkApi,
  } = useAnalysisStore()

  const storeResult = useAnalysisStore(s => s.result)

  const { addDocumentToKB } = useKnowledgeStore()

  const [selectedKB, setSelectedKB] = useState<string | null>(searchParams.get('kb'))
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultType | null>(null)
  const [addedToKB, setAddedToKB] = useState(false)
  const [candidate, setCandidate] = useState<CandidateInfo | null>(null)

  useEffect(() => {
    checkApi()
  }, [checkApi])

  // Sync KB from URL params
  useEffect(() => {
    const kbParam = searchParams.get('kb')
    if (kbParam) setSelectedKB(kbParam)
  }, [searchParams])

  // Fetch candidate info when candidateId is present
  useEffect(() => {
    const candidateId = searchParams.get('candidateId')
    if (candidateId) {
      api.get<CandidateInfo>(`/api/discovery/candidates/${candidateId}`)
        .then(c => {
          setCandidate(c)
          if (c.knowledge_base_id && !searchParams.get('kb')) {
            setSelectedKB(c.knowledge_base_id)
          }
        })
        .catch(() => {})
    }
  }, [searchParams])

  // Use store result directly (populated from SSE complete event)
  useEffect(() => {
    if (storeResult) {
      setAnalysisResult(normalizeAnalysisResult(storeResult))
    }
  }, [storeResult])

  // Fallback: if navigating from history (no store result), fetch from API
  useEffect(() => {
    if (documentId && !storeResult && !running) {
      api.get(`/api/history`)
        .then(items => {
          const latest = (items as any as { document_id: string; result: string }[]).find((h: any) => h.document_id === documentId)
          if (latest) {
            try {
              const raw = JSON.parse(latest.result)
              setAnalysisResult(normalizeAnalysisResult(raw))
            } catch { /* ignore */ }
          }
        })
        .catch(() => {})
    }
  }, [documentId, storeResult, running])

  const handleFile = (fileName: string, fileType: string, text: string) => {
    reset()
    setAnalysisResult(null)
    setAddedToKB(false)
    analyze(fileName, fileType, text, selectedKB || undefined)
  }

  const handleAddToKB = async () => {
    if (!documentId || !selectedKB) return
    try {
      await addDocumentToKB(selectedKB, documentId, {
        fitScore: analysisResult?.knowledgeBaseFitScore,
        recommendedAction: analysisResult?.recommendedAction,
        tags: analysisResult?.suggestedPlacement?.tags?.join(','),
        subDirection: analysisResult?.suggestedPlacement?.subDirection,
      })
      setAddedToKB(true)
      message.success('已收录到知识库')
    } catch {
      message.error('收录失败')
    }
  }

  return (
    <ApiGuard require="analysis">
      <div className="wonder-page wonder-stagger">
        <div className="wonder-page-header">
          <Typography.Title level={4}>文档分析</Typography.Title>
          <Typography.Text type="secondary">上传学术文档，AI 自动提取关键信息</Typography.Text>
        </div>

        {apiStatus === 'checking' && (
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Spin size="small" />
              <span>正在检测 API 连通性...</span>
            </div>
          </Card>
        )}

        {apiStatus === 'error' && (
          <Alert
            type="error"
            showIcon
            message="API 连接失败"
            description={apiError}
            action={
              <Button size="small" icon={<ReloadOutlined />} onClick={() => checkApi()}>
                重试
              </Button>
            }
            style={{ marginBottom: 16 }}
          />
        )}

        {candidate && !steps.length && (
          <Card style={{ marginBottom: 16 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
              来自文献发现的论文
            </Typography.Text>
            <Typography.Title level={5} style={{ fontFamily: 'var(--font-serif)', marginBottom: 8 }}>
              {candidate.title}
            </Typography.Title>
            <Space wrap style={{ marginBottom: 12 }}>
              {candidate.year && <Tag icon={<CalendarOutlined />}>{candidate.year}</Tag>}
              {candidate.url && <Tag icon={<GlobalOutlined />}>有原文链接</Tag>}
            </Space>
            {candidate.authors && (
              <div style={{ marginBottom: 8, color: 'var(--ink-caption)', fontSize: 13 }}>
                <BookOutlined style={{ marginRight: 6 }} />
                {candidate.authors}
              </div>
            )}
            {candidate.abstract && (
              <div style={{
                background: 'var(--bg)', border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 12,
                fontFamily: 'var(--font-serif)', fontSize: 13, lineHeight: 1.7, color: 'var(--ink-secondary)',
                maxHeight: 150, overflow: 'auto',
              }}>
                {candidate.abstract}
              </div>
            )}
            <Alert
              type="info"
              showIcon
              message="请上传论文全文 PDF 进行完整文档分析"
              style={{ marginBottom: 0 }}
            />
          </Card>
        )}

        <Card>
          <div style={{ marginBottom: 16 }}>
            <Typography.Text style={{ display: 'block', marginBottom: 8, color: 'var(--ink-caption)', fontSize: 13 }}>
              目标知识库（可选，不选则做通用分析）
            </Typography.Text>
            <KBSelector
              value={selectedKB}
              onChange={setSelectedKB}
              placeholder="选择知识库以获得上下文分析"
              allowClear
              style={{ width: '100%' }}
            />
          </div>
          <FileUpload onFileContent={handleFile} disabled={running || apiStatus === 'error'} />
        </Card>

        {steps.length > 0 && (
          <Card style={{ marginTop: 16 }}>
            <StepProgress steps={steps} running={running} onCancel={running ? cancel : undefined} />
          </Card>
        )}

        {documentId && !running && (
          <Card style={{ marginTop: 16 }}>
            <div style={{ textAlign: 'center', marginBottom: analysisResult ? 16 : 0 }}>
              <Typography.Text style={{ color: 'var(--accent-text)', fontWeight: 500 }}>
                <CheckCircleOutlined style={{ marginRight: 8 }} />
                分析完成
              </Typography.Text>
            </div>
            {analysisResult && (
              <AnalysisResult
                result={analysisResult}
                knowledgeBaseId={selectedKB ?? undefined}
                onAddToKB={selectedKB && !addedToKB ? handleAddToKB : undefined}
              />
            )}
            {addedToKB && (
              <Alert
                type="success"
                showIcon
                message="已收录到知识库"
                style={{ marginTop: 16 }}
              />
            )}
          </Card>
        )}
      </div>
    </ApiGuard>
  )
}
