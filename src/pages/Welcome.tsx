import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Typography, Input, Select, Button, message, Steps } from 'antd'
import {
  ThunderboltOutlined,
  ApiOutlined,
  UserOutlined,
  BookOutlined,
  KeyOutlined,
  RobotOutlined,
  ExperimentOutlined,
  CheckOutlined,
  PlusOutlined,
  CameraOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import { useConfigStore } from '../stores/config'
import type { AppConfig } from '../types/analysis'

interface ProviderConfig {
  id: string
  name: string
  baseUrl: string
  models: string[]
}

const providers: ProviderConfig[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/anthropic',
    models: ['deepseek-v4-pro', 'deepseek-v4-flash'],
  },
  {
    id: 'mimo',
    name: 'Xiaomi MiMo',
    baseUrl: 'https://token-plan-cn.xiaomimimo.com/anthropic',
    models: ['mimo-v2.5-pro', 'mimo-v2-pro'],
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    baseUrl: 'https://api.minimaxi.com/anthropic',
    models: ['MiniMax-M2.7'],
  },
  {
    id: 'zhipu',
    name: 'Zhipu GLM',
    baseUrl: 'https://open.bigmodel.cn/api/anthropic',
    models: ['glm-5'],
  },
]

export default function Welcome() {
  const navigate = useNavigate()
  const { config, loaded, saveConfig } = useConfigStore()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    provider: '',
    baseUrl: '',
    apiKey: '',
    model: '',
    embeddingProvider: '',
    embeddingBaseUrl: '',
    embeddingApiKey: '',
    embeddingModel: '',
    nickname: '',
    avatar: '',
    globalUserProfile: '',
  })

  // 已有配置则直接进主页
  useEffect(() => {
    if (loaded && config?.provider && config?.apiKey && config?.model) {
      navigate('/', { replace: true })
    }
  }, [loaded, config, navigate])

  const handleProviderChange = (providerId: string, target: 'analysis' | 'embedding') => {
    const provider = providers.find(p => p.id === providerId)
    if (!provider) return
    if (target === 'analysis') {
      setForm(f => ({
        ...f,
        provider: providerId,
        baseUrl: provider.baseUrl,
        model: provider.models[0] || '',
      }))
    } else {
      setForm(f => ({
        ...f,
        embeddingProvider: providerId,
        embeddingBaseUrl: provider.baseUrl,
        embeddingModel: provider.models[0] || '',
      }))
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      message.error('请选择图片文件')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      message.error('头像大小不能超过 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setForm(f => ({ ...f, avatar: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const canProceedStep0 = form.provider && form.apiKey && form.model
  const canProceedStep1 = true // 个人信息可选

  const handleFinish = async () => {
    setSaving(true)
    try {
      const payload: AppConfig = {
        provider: form.provider,
        baseUrl: form.baseUrl,
        apiKey: form.apiKey,
        model: form.model,
        embeddingProvider: form.embeddingProvider || undefined,
        embeddingBaseUrl: form.embeddingBaseUrl || undefined,
        embeddingApiKey: form.embeddingApiKey || undefined,
        embeddingModel: form.embeddingModel || undefined,
        nickname: form.nickname || undefined,
        avatar: form.avatar || undefined,
        globalUserProfile: form.globalUserProfile || undefined,
      }
      await saveConfig(payload)
      message.success('配置完成，欢迎使用 Wonder')
      navigate('/', { replace: true })
    } catch {
      message.error('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const renderProviderCard = (provider: ProviderConfig, target: 'analysis' | 'embedding') => {
    const currentId = target === 'analysis' ? form.provider : form.embeddingProvider
    const isActive = currentId === provider.id
    return (
      <button
        key={provider.id}
        className={`wonder-provider-card ${isActive ? 'wonder-provider-card--active' : ''}`}
        onClick={() => handleProviderChange(provider.id, target)}
      >
        <span className="wonder-provider-name">{provider.name}</span>
        {isActive && <CheckOutlined className="wonder-provider-check" />}
      </button>
    )
  }

  const renderStep0 = () => (
    <div className="welcome-step-content">
      <h3 className="welcome-step-title">
        <ApiOutlined /> 配置 LLM API
      </h3>
      <p className="welcome-step-desc">选择服务商并填入 API Key，用于论文分析和知识库问答</p>

      <div className="welcome-step-section">
        <label className="welcome-step-label">
          <RobotOutlined /> 分析模型
        </label>
        <div className="wonder-provider-grid" style={{ marginBottom: 12 }}>
          {providers.map(p => renderProviderCard(p, 'analysis'))}
          <button
            className={`wonder-provider-card ${form.provider === 'custom' ? 'wonder-provider-card--active' : ''}`}
            onClick={() => setForm(f => ({ ...f, provider: 'custom', model: '' }))}
          >
            <span className="wonder-provider-name"><PlusOutlined /> 自定义</span>
            {form.provider === 'custom' && <CheckOutlined className="wonder-provider-check" />}
          </button>
        </div>

        {form.provider && (
          <>
            <div style={{ marginBottom: 12 }}>
              <Typography.Text style={{ display: 'block', marginBottom: 4, color: 'var(--ink-caption)', fontSize: 12 }}>
                API Base URL
              </Typography.Text>
              <Input
                placeholder="https://api.example.com/anthropic"
                value={form.baseUrl}
                onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <Typography.Text style={{ display: 'block', marginBottom: 4, color: 'var(--ink-caption)', fontSize: 12 }}>
                <KeyOutlined /> API Key
              </Typography.Text>
              <Input.Password
                placeholder="输入 API Key"
                value={form.apiKey}
                onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <Typography.Text style={{ display: 'block', marginBottom: 4, color: 'var(--ink-caption)', fontSize: 12 }}>
                模型名称
              </Typography.Text>
              {form.provider === 'custom' ? (
                <Input
                  placeholder="输入模型名称"
                  value={form.model}
                  onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                />
              ) : (
                <Select
                  style={{ width: '100%' }}
                  placeholder="选择模型"
                  value={form.model || undefined}
                  onChange={value => setForm(f => ({ ...f, model: value }))}
                  options={providers.find(p => p.id === form.provider)?.models.map(m => ({ label: m, value: m }))}
                  showSearch
                />
              )}
            </div>
          </>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', margin: '20px 0' }} />

      <div className="welcome-step-section">
        <label className="welcome-step-label">
          <ExperimentOutlined /> Embedding 模型
          <span style={{ fontWeight: 'normal', color: 'var(--ink-faint)', marginLeft: 8, fontSize: 12 }}>可选，留空则复用分析模型</span>
        </label>
        <div className="wonder-provider-grid" style={{ marginBottom: 12 }}>
          {providers.map(p => renderProviderCard(p, 'embedding'))}
          <button
            className={`wonder-provider-card ${form.embeddingProvider === 'custom' ? 'wonder-provider-card--active' : ''}`}
            onClick={() => setForm(f => ({ ...f, embeddingProvider: 'custom', embeddingModel: '' }))}
          >
            <span className="wonder-provider-name"><PlusOutlined /> 自定义</span>
            {form.embeddingProvider === 'custom' && <CheckOutlined className="wonder-provider-check" />}
          </button>
        </div>

        {form.embeddingProvider && (
          <>
            <div style={{ marginBottom: 12 }}>
              <Typography.Text style={{ display: 'block', marginBottom: 4, color: 'var(--ink-caption)', fontSize: 12 }}>
                API Base URL
              </Typography.Text>
              <Input
                placeholder="https://api.example.com/anthropic"
                value={form.embeddingBaseUrl}
                onChange={e => setForm(f => ({ ...f, embeddingBaseUrl: e.target.value }))}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <Typography.Text style={{ display: 'block', marginBottom: 4, color: 'var(--ink-caption)', fontSize: 12 }}>
                <KeyOutlined /> API Key
                {form.apiKey && (
                  <span style={{ marginLeft: 8, color: 'var(--ink-faint)', fontSize: 11 }}>(留空则复用分析模型的 Key)</span>
                )}
              </Typography.Text>
              <Input.Password
                placeholder="输入 API Key"
                value={form.embeddingApiKey}
                onChange={e => setForm(f => ({ ...f, embeddingApiKey: e.target.value }))}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <Typography.Text style={{ display: 'block', marginBottom: 4, color: 'var(--ink-caption)', fontSize: 12 }}>
                模型名称
              </Typography.Text>
              {form.embeddingProvider === 'custom' ? (
                <Input
                  placeholder="输入模型名称"
                  value={form.embeddingModel}
                  onChange={e => setForm(f => ({ ...f, embeddingModel: e.target.value }))}
                />
              ) : (
                <Select
                  style={{ width: '100%' }}
                  placeholder="选择模型"
                  value={form.embeddingModel || undefined}
                  onChange={value => setForm(f => ({ ...f, embeddingModel: value }))}
                  options={providers.find(p => p.id === form.embeddingProvider)?.models.map(m => ({ label: m, value: m }))}
                  showSearch
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )

  const renderStep1 = () => (
    <div className="welcome-step-content">
      <h3 className="welcome-step-title">
        <UserOutlined /> 个人信息
      </h3>
      <p className="welcome-step-desc">设置昵称和头像，AI 在对话中会用昵称称呼你</p>

      <div className="welcome-step-profile">
        <div
          className="welcome-step-avatar"
          onClick={() => fileInputRef.current?.click()}
        >
          {form.avatar ? (
            <img src={form.avatar} alt="头像" />
          ) : (
            <CameraOutlined style={{ fontSize: 28, color: 'var(--ink-ghost)' }} />
          )}
          <div className="welcome-step-avatar-overlay">
            <CameraOutlined style={{ fontSize: 14, color: '#fff' }} />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <Typography.Text style={{ display: 'block', marginBottom: 4, color: 'var(--ink-caption)', fontSize: 12 }}>
          昵称
        </Typography.Text>
        <Input
          placeholder="你希望 AI 怎么称呼你"
          value={form.nickname}
          onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
          maxLength={20}
          showCount
        />
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="welcome-step-content">
      <h3 className="welcome-step-title">
        <BookOutlined /> 研究方向
      </h3>
      <p className="welcome-step-desc">描述你的研究背景，帮助 AI 更好地理解你的学术需求</p>

      <div style={{ marginBottom: 16 }}>
        <Typography.Text style={{ display: 'block', marginBottom: 4, color: 'var(--ink-caption)', fontSize: 12 }}>
          全局用户画像
        </Typography.Text>
        <Typography.Text style={{ display: 'block', marginBottom: 8, color: 'var(--ink-faint)', fontSize: 12 }}>
          描述你的专业、研究阶段、长期兴趣、偏好方法、写作风格等
        </Typography.Text>
        <Input.TextArea
          rows={8}
          placeholder={`例如：
- 专业：计算机科学，研二
- 研究方向：大语言模型在教育领域的应用
- 偏好方法：混合研究方法，注重实证
- 写作风格：学术正式，偏好结构化表达
- 分析偏好：关注方法论创新和实际应用价值
- 约束：避免泛泛而谈，标记不确定的结论`}
          value={form.globalUserProfile}
          onChange={e => setForm(f => ({ ...f, globalUserProfile: e.target.value }))}
          style={{ resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 13 }}
        />
      </div>
    </div>
  )

  const steps = [
    { title: 'API 配置', icon: <ApiOutlined /> },
    { title: '个人信息', icon: <UserOutlined /> },
    { title: '研究方向', icon: <BookOutlined /> },
  ]

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'var(--bg)',
    }}>
      <div style={{ width: '100%', maxWidth: 560, padding: '0 24px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: 'linear-gradient(135deg, var(--accent), #7BA08E)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(91, 127, 110, 0.3)',
          }}>
            <ThunderboltOutlined style={{ fontSize: 26, color: '#fff' }} />
          </div>
          <Typography.Title level={3} style={{ fontFamily: 'var(--font-serif)', marginBottom: 4 }}>
            欢迎使用 Wonder
          </Typography.Title>
          <Typography.Text style={{ color: 'var(--ink-caption)', fontSize: 14 }}>
            完成以下配置开始你的学术之旅
          </Typography.Text>
        </div>

        {/* Steps */}
        <Steps
          current={step}
          items={steps.map(s => ({ title: s.title, icon: s.icon }))}
          style={{ marginBottom: 32 }}
          size="small"
        />

        {/* Step content */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 12,
          border: '1px solid var(--border)',
          padding: '24px 28px',
          minHeight: 320,
          marginBottom: 24,
        }}>
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            disabled={step === 0}
            onClick={() => setStep(s => s - 1)}
            icon={<ArrowLeftOutlined />}
          >
            上一步
          </Button>
          {step < 2 ? (
            <Button
              type="primary"
              disabled={step === 0 && !canProceedStep0}
              onClick={() => setStep(s => s + 1)}
            >
              下一步 <ArrowRightOutlined />
            </Button>
          ) : (
            <Button
              type="primary"
              loading={saving}
              onClick={handleFinish}
            >
              完成配置
            </Button>
          )}
        </div>

        {/* Skip hint */}
        {step === 1 && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Button type="link" size="small" onClick={() => setStep(2)} style={{ color: 'var(--ink-faint)' }}>
              跳过此步
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
