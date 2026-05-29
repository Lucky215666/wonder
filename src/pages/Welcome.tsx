import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Typography } from 'antd'
import { ThunderboltOutlined } from '@ant-design/icons'
import { useConfigStore } from '../stores/config'
import { useUIStore } from '../stores/ui'

export default function Welcome() {
  const navigate = useNavigate()
  const { config, loaded } = useConfigStore()
  const { openSettings } = useUIStore()

  // 已有配置则直接进主页
  useEffect(() => {
    if (loaded && config?.provider && config?.apiKey && config?.model) {
      navigate('/', { replace: true })
    }
  }, [loaded, config, navigate])

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'var(--bg)',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 440 }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: 'linear-gradient(135deg, var(--accent), #7BA08E)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 8px 24px rgba(91, 127, 110, 0.3)',
        }}>
          <ThunderboltOutlined style={{ fontSize: 30, color: '#fff' }} />
        </div>
        <Typography.Title level={2} style={{ fontFamily: 'var(--font-serif)', marginBottom: 8 }}>
          欢迎使用 Wonder
        </Typography.Title>
        <Typography.Text style={{ display: 'block', color: 'var(--ink-caption)', marginBottom: 32, fontSize: 15, lineHeight: 1.6 }}>
          请先配置 LLM API 以开始学术分析
        </Typography.Text>
        <button
          className="wonder-provider-card wonder-provider-card--active"
          style={{ display: 'inline-flex', padding: '12px 32px', fontSize: 15 }}
          onClick={() => openSettings('analysis')}
        >
          打开设置
        </button>
      </div>
    </div>
  )
}
