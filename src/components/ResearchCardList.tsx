import { useState } from 'react'
import {
  Card, List, Tag, Space, Select, Input, Button, Modal, Form,
  Popconfirm, Empty, Spin, Typography, Tooltip,
} from 'antd'
import {
  BookOutlined, EditOutlined, DeleteOutlined,
  WarningOutlined, FileTextOutlined,
} from '@ant-design/icons'
import { useKnowledgeStore, type ResearchCard, type ResearchCardFilters } from '../stores/knowledge'
import type { KnowledgeType, ResearchCardDraft } from '../types/research-card'

const KNOWLEDGE_TYPE_OPTIONS = [
  { value: 'method', label: '方法' },
  { value: 'theory', label: '理论' },
  { value: 'finding', label: '发现' },
  { value: 'research_question', label: '研究问题' },
  { value: 'gap', label: 'Gap' },
  { value: 'limitation', label: '局限' },
  { value: 'writing_material', label: '写作素材' },
  { value: 'other', label: '其他' },
]

const KNOWLEDGE_TYPE_COLORS: Record<string, string> = {
  method: 'blue',
  theory: 'purple',
  finding: 'green',
  research_question: 'orange',
  gap: 'red',
  limitation: 'volcano',
  writing_material: 'cyan',
  other: 'default',
}

export default function ResearchCardList() {
  const {
    researchCards, researchCardsLoading, researchCardFilters,
    loadResearchCards, updateResearchCard, archiveResearchCard,
  } = useKnowledgeStore()
  const selectedKBId = useKnowledgeStore(s => s.selectedKBId)

  const [cardTypeFilter, setCardTypeFilter] = useState<string | undefined>()
  const [cardTagFilter, setCardTagFilter] = useState<string | undefined>()
  const [editingCard, setEditingCard] = useState<ResearchCard | null>(null)
  const [editForm] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const handleFilterChange = (type?: string, tag?: string) => {
    if (!selectedKBId) return
    const filters: ResearchCardFilters = {}
    if (type) filters.knowledgeType = type as KnowledgeType
    if (tag) filters.tag = tag
    loadResearchCards(selectedKBId, filters)
  }

  const openEdit = (card: ResearchCard) => {
    setEditingCard(card)
    editForm.setFieldsValue({
      coreClaims: card.coreClaims.join('\n'),
      tags: card.tags,
      validationNotes: card.validationNotes,
      useCases: card.useCases,
    })
  }

  const handleSave = async () => {
    if (!editingCard) return
    try {
      setSaving(true)
      const values = await editForm.validateFields()
      const updates: Partial<ResearchCardDraft> = {
        coreClaims: (values.coreClaims as string).split('\n').map((s: string) => s.trim()).filter(Boolean),
        tags: values.tags,
        validationNotes: values.validationNotes || '',
        useCases: values.useCases || [],
      }
      await updateResearchCard(editingCard.id, updates)
      if (selectedKBId) await loadResearchCards(selectedKBId, researchCardFilters)
      setEditingCard(null)
      editForm.resetFields()
    } catch {
      // form validation error
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card
      size="small"
      title={<><BookOutlined /> 沉淀卡片</>}
      extra={<Tag>{researchCards.length} 张</Tag>}
    >
      {/* Filters */}
      <Space wrap style={{ marginBottom: 12 }}>
        <Select
          allowClear
          size="small"
          placeholder="类型"
          value={cardTypeFilter}
          onChange={(value) => {
            setCardTypeFilter(value)
            handleFilterChange(value, cardTagFilter)
          }}
          options={KNOWLEDGE_TYPE_OPTIONS}
          style={{ width: 130 }}
        />
        <Input.Search
          size="small"
          placeholder="标签"
          onSearch={(value) => {
            const tag = value || undefined
            setCardTagFilter(tag)
            handleFilterChange(cardTypeFilter, tag)
          }}
          style={{ width: 180 }}
          allowClear
        />
      </Space>

      {/* Card list */}
      {researchCardsLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin /></div>
      ) : researchCards.length === 0 ? (
        <Empty description="暂无沉淀卡片" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          size="small"
          dataSource={researchCards}
          renderItem={(card) => (
            <List.Item
              actions={[
                <Button key="edit" type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(card)}>
                  编辑
                </Button>,
                <Popconfirm
                  key="archive"
                  title="确认归档此卡片？"
                  onConfirm={() => archiveResearchCard(card.id)}
                  okText="归档"
                  cancelText="取消"
                >
                  <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                    归档
                  </Button>
                </Popconfirm>,
              ]}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Tag color={KNOWLEDGE_TYPE_COLORS[card.knowledgeType] || 'default'}>
                    {KNOWLEDGE_TYPE_OPTIONS.find(o => o.value === card.knowledgeType)?.label || card.knowledgeType}
                  </Tag>
                  {card.noPaperEvidence && (
                    <Tooltip title="无论文证据支撑">
                      <Tag icon={<WarningOutlined />} color="warning">无证据</Tag>
                    </Tooltip>
                  )}
                  {card.linkedDocIds.length > 0 && (
                    <Tag icon={<FileTextOutlined />}>{card.linkedDocIds.length} 篇文献</Tag>
                  )}
                </div>
                {card.coreClaims.length > 0 && (
                  <Typography.Text style={{ display: 'block', marginTop: 4 }} ellipsis>
                    {card.coreClaims[0]}
                  </Typography.Text>
                )}
                {card.tags.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    {card.tags.map(tag => (
                      <Tag key={tag} style={{ fontSize: 11 }}>{tag}</Tag>
                    ))}
                  </div>
                )}
              </div>
            </List.Item>
          )}
        />
      )}

      {/* Edit modal */}
      <Modal
        title="编辑沉淀卡片"
        open={!!editingCard}
        onOk={handleSave}
        onCancel={() => { setEditingCard(null); editForm.resetFields() }}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        width={600}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="coreClaims"
            label="核心论点（每行一条）"
            rules={[{ required: true, message: '请输入至少一条核心论点' }]}
          >
            <Input.TextArea rows={4} placeholder="每行输入一条核心论点" />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="输入标签后回车" />
          </Form.Item>
          <Form.Item name="validationNotes" label="验证说明">
            <Input.TextArea rows={3} placeholder="记录验证过程或备注" />
          </Form.Item>
          <Form.Item name="useCases" label="使用场景">
            <Select mode="tags" placeholder="输入使用场景后回车" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
