import { useEffect, useRef, useState } from 'react'
import { Input, Button, message, Avatar, Tag, Select, Typography } from 'antd'
import {
  ApiOutlined,
  KeyOutlined,
  RobotOutlined,
  ExperimentOutlined,
  UserOutlined,
  FileTextOutlined,
  SyncOutlined,
  CloseOutlined,
  BookOutlined,
  CheckOutlined,
  PlusOutlined,
  CameraOutlined,
} from '@ant-design/icons'
import { useConfigStore } from '../stores/config'
import { useUIStore } from '../stores/ui'
import type { AppConfig } from '../lib/llm/types'

type SettingsTab = 'api' | 'research' | 'update' | 'profile'

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

const tabs: { key: SettingsTab; icon: React.ReactNode; label: string }[] = [
  { key: 'api', icon: <ApiOutlined />, label: 'API 设置' },
  { key: 'research', icon: <BookOutlined />, label: '研究背景' },
  { key: 'update', icon: <SyncOutlined />, label: '查看更新' },
  { key: 'profile', icon: <UserOutlined />, label: '我' },
]

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { config, loadConfig, saveConfig } = useConfigStore()
  const { settingsTarget } = useUIStore()
  const [activeTab, setActiveTab] = useState<SettingsTab>('api')
  const analysisRef = useRef<HTMLDivElement>(null)
  const embeddingRef = useRef<HTMLDivElement>(null)
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
    researchBackground: '',
    nickname: '',
    avatar: '',
  })

  useEffect(() => { loadConfig() }, [loadConfig])

  useEffect(() => {
    if (open) {
      setActiveTab('api')
      setTimeout(() => {
        const ref = settingsTarget === 'embedding' ? embeddingRef.current : analysisRef.current
        ref?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [open, settingsTarget])

  useEffect(() => {
    if (config) {
      setForm({
        provider: config.provider || '',
        baseUrl: config.baseUrl || '',
        apiKey: config.apiKey || '',
        model: config.model || '',
        embeddingProvider: config.embeddingProvider || '',
        embeddingBaseUrl: config.embeddingBaseUrl || '',
        embeddingApiKey: config.embeddingApiKey || '',
        embeddingModel: config.embeddingModel || '',
        researchBackground: '',
        nickname: config.nickname || '',
        avatar: config.avatar || '',
      })
    }
  }, [config])

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

  const handleCustomProvider = (target: 'analysis' | 'embedding') => {
    if (target === 'analysis') {
      setForm(f => ({ ...f, provider: 'custom', model: '' }))
    } else {
      setForm(f => ({ ...f, embeddingProvider: 'custom', embeddingModel: '' }))
    }
  }

  const handleSave = async () => {
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
    }
    await saveConfig(payload)
    message.success('设置已保存')
  }

  const renderProviderSection = (
    target: 'analysis' | 'embedding',
    title: string,
    icon: React.ReactNode,
    providerId: string,
    baseUrl: string,
    apiKey: string,
    model: string,
  ) => {
    const currentProvider = providers.find(p => p.id === providerId)
    const isCustom = providerId === 'custom'

    return (
      <div className="wonder-settings-field">
        <label className="wonder-settings-label">
          {icon} {title}
        </label>

        {/* 服务商选择 */}
        <div className="wonder-provider-grid" style={{ marginBottom: 12 }}>
          {providers.map(provider => (
            <button
              key={provider.id}
              className={`wonder-provider-card ${providerId === provider.id ? 'wonder-provider-card--active' : ''}`}
              onClick={() => handleProviderChange(provider.id, target)}
            >
              <span className="wonder-provider-name">{provider.name}</span>
              {providerId === provider.id && (
                <CheckOutlined className="wonder-provider-check" />
              )}
            </button>
          ))}
          <button
            className={`wonder-provider-card ${isCustom ? 'wonder-provider-card--active' : ''}`}
            onClick={() => handleCustomProvider(target)}
          >
            <span className="wonder-provider-name"><PlusOutlined /> 自定义</span>
            {isCustom && (
              <CheckOutlined className="wonder-provider-check" />
            )}
          </button>
        </div>

        {/* 配置详情 */}
        {(providerId || isCustom) && (
          <>
            <div style={{ marginBottom: 12 }}>
              <Typography.Text style={{ display: 'block', marginBottom: 4, color: 'var(--ink-caption)', fontSize: 12 }}>
                API Base URL
              </Typography.Text>
              <Input
                placeholder="https://api.example.com/anthropic"
                value={baseUrl}
                onChange={e => {
                  if (target === 'analysis') {
                    setForm(f => ({ ...f, baseUrl: e.target.value }))
                  } else {
                    setForm(f => ({ ...f, embeddingBaseUrl: e.target.value }))
                  }
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <Typography.Text style={{ display: 'block', marginBottom: 4, color: 'var(--ink-caption)', fontSize: 12 }}>
                <KeyOutlined /> API Key
                {target === 'embedding' && form.apiKey && (
                  <span style={{ marginLeft: 8, color: 'var(--ink-muted)', fontSize: 11 }}>
                    (留空则复用分析模型的 Key)
                  </span>
                )}
              </Typography.Text>
              <Input.Password
                placeholder={`输入 API Key`}
                value={apiKey}
                onChange={e => {
                  if (target === 'analysis') {
                    setForm(f => ({ ...f, apiKey: e.target.value }))
                  } else {
                    setForm(f => ({ ...f, embeddingApiKey: e.target.value }))
                  }
                }}
              />
            </div>

            <div style={{ marginBottom: 8 }}>
              <Typography.Text style={{ display: 'block', marginBottom: 4, color: 'var(--ink-caption)', fontSize: 12 }}>
                模型名称
              </Typography.Text>
              {isCustom ? (
                <Input
                  placeholder="输入模型名称"
                  value={model}
                  onChange={e => {
                    if (target === 'analysis') {
                      setForm(f => ({ ...f, model: e.target.value }))
                    } else {
                      setForm(f => ({ ...f, embeddingModel: e.target.value }))
                    }
                  }}
                />
              ) : (
                <Select
                  style={{ width: '100%' }}
                  placeholder="选择模型"
                  value={model || undefined}
                  onChange={value => {
                    if (target === 'analysis') {
                      setForm(f => ({ ...f, model: value }))
                    } else {
                      setForm(f => ({ ...f, embeddingModel: value }))
                    }
                  }}
                  options={currentProvider?.models.map(m => ({ label: m, value: m }))}
                  showSearch
                />
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  if (!open) return null

  return (
    <div className="wonder-settings-overlay" onClick={onClose}>
      <div className="wonder-settings-modal" onClick={e => e.stopPropagation()}>
        {/* 左侧导航 */}
        <nav className="wonder-settings-nav">
          <div className="wonder-settings-nav-header">
            <span className="wonder-settings-nav-title">设置</span>
            <button className="wonder-settings-close" onClick={onClose}>
              <CloseOutlined />
            </button>
          </div>

          <div className="wonder-settings-nav-items">
            {tabs.map(tab => (
              <button
                key={tab.key}
                className={`wonder-settings-nav-item ${activeTab === tab.key ? 'wonder-settings-nav-item--active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="wonder-settings-nav-icon">{tab.icon}</span>
                <span className="wonder-settings-nav-label">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* 右侧内容 */}
        <main className="wonder-settings-content">
          {activeTab === 'api' && (
            <div className="wonder-settings-pane">
              <h2 className="wonder-settings-pane-title">
                <ApiOutlined /> LLM 配置
              </h2>
              <p className="wonder-settings-pane-desc">分别配置分析模型和 Embedding 模型</p>

              {/* 分析模型配置 */}
              <div ref={analysisRef}>
                {renderProviderSection(
                  'analysis',
                  '分析模型',
                  <RobotOutlined />,
                  form.provider,
                  form.baseUrl,
                  form.apiKey,
                  form.model,
                )}
              </div>

              {/* 分隔线 */}
              <div style={{ borderTop: '1px solid var(--border)', margin: '20px 0' }} />

              {/* Embedding 模型配置 */}
              <div ref={embeddingRef}>
                {renderProviderSection(
                  'embedding',
                  'Embedding 模型',
                  <ExperimentOutlined />,
                  form.embeddingProvider,
                  form.embeddingBaseUrl,
                  form.embeddingApiKey || '',
                  form.embeddingModel,
                )}
              </div>

              <Button type="primary" onClick={handleSave} style={{ marginTop: 16 }}>
                保存 API 设置
              </Button>
            </div>
          )}

          {activeTab === 'research' && (
            <div className="wonder-settings-pane">
              <h2 className="wonder-settings-pane-title">
                <BookOutlined /> 研究背景
              </h2>
              <p className="wonder-settings-pane-desc">
                描述你的研究方向和兴趣，帮助 AI 更好地理解你的需求
              </p>

              <div className="wonder-settings-field">
                <label className="wonder-settings-label">
                  <FileTextOutlined /> 研究方向描述
                </label>
                <Input.TextArea
                  rows={6}
                  placeholder="例如：我是计算机视觉方向的研究生，主要关注目标检测和图像分割..."
                  value={form.researchBackground}
                  onChange={e => setForm(f => ({ ...f, researchBackground: e.target.value }))}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <Button type="primary" onClick={handleSave} style={{ marginTop: 8 }}>
                保存研究背景
              </Button>
            </div>
          )}

          {activeTab === 'update' && (
            <div className="wonder-settings-pane">
              <h2 className="wonder-settings-pane-title">
                <SyncOutlined /> 查看更新
              </h2>
              <p className="wonder-settings-pane-desc">了解 Wonder 的最新功能和改进</p>

              <div className="wonder-settings-update-card">
                <div className="wonder-settings-update-header">
                  <Tag color="green">最新版本</Tag>
                  <span className="wonder-settings-update-version">v1.0.0</span>
                  <span className="wonder-settings-update-date">2026-05-29</span>
                </div>
                <ul className="wonder-settings-update-list">
                  <li>单篇论文深度分析</li>
                  <li>批量矩阵对比</li>
                  <li>文献发现与引用网络</li>
                  <li>追溯问答系统</li>
                  <li>知识库管理</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="wonder-settings-pane">
              <h2 className="wonder-settings-pane-title">
                <UserOutlined /> 我的资料
              </h2>
              <p className="wonder-settings-pane-desc">管理你的个人信息，AI 在对话中会用昵称称呼你</p>

              <div className="wonder-settings-profile">
                <div
                  className="wonder-settings-avatar"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {form.avatar ? (
                    <img src={form.avatar} alt="头像" />
                  ) : (
                    <CameraOutlined style={{ fontSize: 24, color: 'var(--ink-ghost)' }} />
                  )}
                  <div className="wonder-settings-avatar-overlay">
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
                <div className="wonder-settings-profile-info">
                  <span className="wonder-settings-profile-name">
                    {form.nickname || 'Wonder 用户'}
                  </span>
                  <span className="wonder-settings-profile-email">
                    {form.nickname ? '点击头像更换照片' : '设置昵称后 AI 会这样称呼你'}
                  </span>
                </div>
              </div>

              <div className="wonder-settings-field" style={{ marginTop: 20 }}>
                <label className="wonder-settings-label">
                  <UserOutlined /> 昵称
                </label>
                <Input
                  placeholder="你希望 AI 怎么称呼你"
                  value={form.nickname}
                  onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
                  maxLength={20}
                  showCount
                />
              </div>

              <Button type="primary" onClick={handleSave} style={{ marginTop: 8 }}>
                保存个人资料
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
