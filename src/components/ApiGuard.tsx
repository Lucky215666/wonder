import { Button, Typography } from 'antd'
import { ApiOutlined, ExperimentOutlined, SettingOutlined } from '@ant-design/icons'
import { useConfigStore } from '../stores/config'
import { useUIStore } from '../stores/ui'

interface ApiGuardProps {
  require: 'analysis' | 'embedding'
  children: React.ReactNode
}

export default function ApiGuard({ require, children }: ApiGuardProps) {
  const { config, loaded } = useConfigStore()
  const { openSettings } = useUIStore()

  if (!loaded) return null

  const isConfigured = (() => {
    if (!config) return false
    if (require === 'analysis') {
      return !!(config.provider && config.apiKey && config.model)
    }
    // embedding: 需要 embeddingModel，以及 apiKey（优先 embedding 自己的，否则复用分析的）
    return !!(config.embeddingModel && (config.embeddingApiKey || config.apiKey))
  })()

  if (isConfigured) return <>{children}</>

  const isAnalysis = require === 'analysis'
  const icon = isAnalysis ? <ApiOutlined /> : <ExperimentOutlined />
  const title = isAnalysis ? '尚未配置分析模型' : '尚未配置 Embedding 模型'
  const desc = isAnalysis
    ? '文档分析、批量分析、追溯问答等功能需要分析模型支持'
    : '知识库的向量检索功能需要 Embedding 模型支持'

  return (
    <div className="wonder-page" style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '60vh',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'var(--bg)',
          border: '2px dashed var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: 28,
          color: 'var(--ink-ghost)',
        }}>
          {icon}
        </div>
        <Typography.Title level={4} style={{ fontFamily: 'var(--font-serif)', marginBottom: 8 }}>
          {title}
        </Typography.Title>
        <Typography.Text style={{ display: 'block', color: 'var(--ink-caption)', marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
          {desc}
        </Typography.Text>
        <Button
          type="primary"
          icon={<SettingOutlined />}
          size="large"
          onClick={() => openSettings(isAnalysis ? 'analysis' : 'embedding')}
        >
          去配置
        </Button>
      </div>
    </div>
  )
}
