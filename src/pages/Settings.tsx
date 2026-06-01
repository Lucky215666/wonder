import { useEffect, useRef, useState } from 'react'
import { Card, Input, Button, Typography, Space, message, Select } from 'antd'
import {
  ApiOutlined,
  KeyOutlined,
  RobotOutlined,
  ExperimentOutlined,
  UserOutlined,
  CheckOutlined,
  PlusOutlined,
  CameraOutlined,
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

export default function Settings() {
  const { config, loadConfig, saveConfig } = useConfigStore()
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

  const renderProviderSelect = (target: 'analysis' | 'embedding') => {
    const providerId = target === 'analysis' ? form.provider : form.embeddingProvider
    const isCustom = providerId === 'custom'

    return (
      <>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {providers.map(p => (
            <Button
              key={p.id}
              size="small"
              type={providerId === p.id ? 'primary' : 'default'}
              onClick={() => handleProviderChange(p.id, target)}
            >
              {p.name}
            </Button>
          ))}
          <Button
            size="small"
            type={isCustom ? 'primary' : 'default'}
            icon={<PlusOutlined />}
            onClick={() => {
              if (target === 'analysis') {
                setForm(f => ({ ...f, provider: 'custom', model: '' }))
              } else {
                setForm(f => ({ ...f, embeddingProvider: 'custom', embeddingModel: '' }))
              }
            }}
          >
            自定义
          </Button>
        </div>

        {(providerId || isCustom) && (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>
              <Typography.Text style={{ display: 'block', marginBottom: 4, color: 'var(--ink-caption)', fontSize: 12 }}>
                API Base URL
              </Typography.Text>
              <Input
                placeholder="https://api.example.com/anthropic"
                value={target === 'analysis' ? form.baseUrl : form.embeddingBaseUrl}
                onChange={e => {
                  if (target === 'analysis') {
                    setForm(f => ({ ...f, baseUrl: e.target.value }))
                  } else {
                    setForm(f => ({ ...f, embeddingBaseUrl: e.target.value }))
                  }
                }}
              />
            </div>
            <div>
              <Typography.Text style={{ display: 'block', marginBottom: 4, color: 'var(--ink-caption)', fontSize: 12 }}>
                <KeyOutlined /> API Key
              </Typography.Text>
              <Input.Password
                placeholder="输入 API Key"
                value={target === 'analysis' ? form.apiKey : form.embeddingApiKey}
                onChange={e => {
                  if (target === 'analysis') {
                    setForm(f => ({ ...f, apiKey: e.target.value }))
                  } else {
                    setForm(f => ({ ...f, embeddingApiKey: e.target.value }))
                  }
                }}
              />
            </div>
            <div>
              <Typography.Text style={{ display: 'block', marginBottom: 4, color: 'var(--ink-caption)', fontSize: 12 }}>
                模型
              </Typography.Text>
              {isCustom ? (
                <Input
                  placeholder="输入模型名称"
                  value={target === 'analysis' ? form.model : form.embeddingModel}
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
                  value={(target === 'analysis' ? form.model : form.embeddingModel) || undefined}
                  onChange={value => {
                    if (target === 'analysis') {
                      setForm(f => ({ ...f, model: value }))
                    } else {
                      setForm(f => ({ ...f, embeddingModel: value }))
                    }
                  }}
                  options={providers.find(p => p.id === providerId)?.models.map(m => ({ label: m, value: m }))}
                  showSearch
                />
              )}
            </div>
          </Space>
        )}
      </>
    )
  }

  return (
    <div className="wonder-page wonder-stagger">
      <div className="wonder-page-header">
        <Typography.Title level={4}>设置</Typography.Title>
        <Typography.Text type="secondary">管理 API 配置和研究偏好</Typography.Text>
      </div>

      <div className="wonder-settings-section">
        <div className="wonder-settings-section__title">
          <UserOutlined /> 个人资料
        </div>
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
          <div style={{ flex: 1 }}>
            <Typography.Text style={{ display: 'block', marginBottom: 4, color: 'var(--ink-caption)', fontSize: 12 }}>
              昵称
            </Typography.Text>
            <Input
              placeholder="AI 会这样称呼你"
              value={form.nickname}
              onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
              style={{ maxWidth: 300 }}
            />
            <Typography.Text style={{ display: 'block', marginTop: 8, color: 'var(--ink-ghost)', fontSize: 12 }}>
              设置后，AI 在对话中会用这个称呼来叫你
            </Typography.Text>
          </div>
        </div>
      </div>

      <div className="wonder-settings-section">
        <div className="wonder-settings-section__title">
          <RobotOutlined /> 分析模型
        </div>
        {renderProviderSelect('analysis')}
      </div>

      <div className="wonder-settings-section">
        <div className="wonder-settings-section__title">
          <ExperimentOutlined /> Embedding 模型
        </div>
        {renderProviderSelect('embedding')}
      </div>

      <div className="wonder-settings-section">
        <div className="wonder-settings-section__title">
          <UserOutlined /> 研究背景
        </div>
        <Typography.Text style={{ display: 'block', marginBottom: 12, color: 'var(--ink-caption)', fontSize: 13 }}>
          描述你的研究方向和兴趣，帮助 AI 更好地理解你的需求
        </Typography.Text>
        <Input.TextArea
          rows={4}
          placeholder="例如：我是计算机视觉方向的研究生，主要关注目标检测和图像分割..."
          value={form.researchBackground}
          onChange={e => setForm(f => ({ ...f, researchBackground: e.target.value }))}
          style={{ resize: 'vertical' }}
        />
      </div>

      <Button type="primary" size="large" onClick={handleSave} style={{ marginTop: 8 }}>
        保存设置
      </Button>
    </div>
  )
}
