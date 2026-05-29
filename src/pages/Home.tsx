import { Card, Typography } from 'antd'
import FileUpload from '../components/FileUpload'
import StepProgress from '../components/StepProgress'
import ApiGuard from '../components/ApiGuard'
import { useAnalysisStore } from '../stores/analysis'

export default function Home() {
  const { steps, documentId, analyze, reset } = useAnalysisStore()

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

        <Card>
          <FileUpload onFileContent={handleFile} />
        </Card>

        {steps.length > 0 && (
          <Card style={{ marginTop: 16 }}>
            <StepProgress steps={steps} />
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
