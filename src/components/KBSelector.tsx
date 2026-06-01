import { useEffect } from 'react'
import { Select, Tag } from 'antd'
import { BookOutlined } from '@ant-design/icons'
import { useKnowledgeStore } from '../stores/knowledge'

interface Props {
  value?: string | null
  onChange?: (value: string | null) => void
  placeholder?: string
  allowClear?: boolean
  style?: React.CSSProperties
}

export default function KBSelector({ value, onChange, placeholder = '选择知识库', allowClear = true, style }: Props) {
  const { knowledgeBases, kbLoading, loadKnowledgeBases } = useKnowledgeStore()

  useEffect(() => { loadKnowledgeBases() }, [loadKnowledgeBases])

  return (
    <Select
      value={value || undefined}
      onChange={(v) => onChange?.(v || null)}
      placeholder={placeholder}
      allowClear={allowClear}
      loading={kbLoading}
      style={{ minWidth: 200, ...style }}
      suffixIcon={<BookOutlined />}
      options={knowledgeBases.map(kb => ({
        label: (
          <span>
            {kb.name}
            {'documentCount' in kb && (
              <Tag style={{ marginLeft: 8 }} color="default">
                {(kb as { documentCount?: number }).documentCount ?? 0} 篇
              </Tag>
            )}
          </span>
        ),
        value: kb.id,
      }))}
      showSearch
      filterOption={(input, option) => {
        const label = typeof option?.label === 'string' ? option.label : ''
        return label.toLowerCase().includes(input.toLowerCase())
      }}
    />
  )
}
