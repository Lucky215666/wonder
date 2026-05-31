import { useEffect } from 'react'
import { Card, Typography, Alert, Button, Spin } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import FileUpload from '../components/FileUpload'
import StepProgress from '../components/StepProgress'
import ApiGuard from '../components/ApiGuard'
import { useAnalysisStore } from '../stores/analysis'

export default function Home() {
  const {
    steps, documentId, running,
    apiStatus, apiError,
    analyze, reset, cancel, checkApi,
  } = useAnalysisStore()

  useEffect(() => {
    checkApi()
  }, [checkApi])

  const handleFile = (fileName: string, fileType: string, text: string) => {
    reset()
    analyze(fileName, fileType, text)
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
          <FileUpload onFileContent={handleFile} disabled={running || apiStatus === 'error'} />
        </Card>

        {steps.length > 0 && (
          <Card style={{ marginTop: 16 }}>
            <StepProgress steps={steps} running={running} onCancel={running ? cancel : undefined} />
          </Card>
        )}

        {documentId && (
          <Card style={{ marginTop: 16, textAlign: 'center' }}>
            <Typography.Text style={{ color: 'var(--accent-text)', fontWeight: 500 }}>
              分析完成！文档 ID: {documentId}
            </Typography.Text>
          </Card>
        )}
      </div>
    </ApiGuard>
  )
}
