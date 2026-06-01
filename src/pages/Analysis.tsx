import { useEffect, useState } from 'react'
import { Card, Typography, Alert, Button, Spin, message } from 'antd'
import { ReloadOutlined, CheckCircleOutlined } from '@ant-design/icons'
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

export default function Analysis() {
  const [searchParams] = useSearchParams()
  const {
    steps, documentId, knowledgeBaseId, running,
    apiStatus, apiError,
    analyze, reset, cancel, checkApi,
  } = useAnalysisStore()

  const { addDocumentToKB } = useKnowledgeStore()

  const [selectedKB, setSelectedKB] = useState<string | null>(searchParams.get('kb'))
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultType | null>(null)
  const [addedToKB, setAddedToKB] = useState(false)

  useEffect(() => {
    checkApi()
  }, [checkApi])

  // Sync KB from URL params
  useEffect(() => {
    const kbParam = searchParams.get('kb')
    if (kbParam) setSelectedKB(kbParam)
  }, [searchParams])

  // Fetch full analysis result when documentId is available
  useEffect(() => {
    if (documentId) {
      api.get(`/api/history`)
        .then(items => {
          const latest = (items as any as { document_id: string; result: string }[]).find((h: any) => h.document_id === documentId)
          if (latest) {
            try {
              setAnalysisResult(JSON.parse(latest.result))
            } catch { /* ignore */ }
          }
        })
        .catch(() => {})
    }
  }, [documentId])

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
