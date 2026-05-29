import { useEffect } from 'react'
import { Typography, Button, Popconfirm, Empty, message } from 'antd'
import { DeleteOutlined, BookOutlined } from '@ant-design/icons'
import { useKnowledgeStore } from '../stores/knowledge'
import FileUpload from '../components/FileUpload'
import ApiGuard from '../components/ApiGuard'

export default function Knowledge() {
  const { documents, loading, loadDocuments, deleteDocument } = useKnowledgeStore()

  useEffect(() => { loadDocuments() }, [loadDocuments])

  const handleUpload = async (fileName: string, fileType: string, content: string) => {
    message.info('知识库上传功能待集成')
  }

  const list = documents as { id: string; file_name: string; created_at: string }[]

  return (
    <ApiGuard require="embedding">
    <div className="wonder-page wonder-stagger">
      <div className="wonder-page-header">
        <Typography.Title level={4}>知识库</Typography.Title>
        <Typography.Text type="secondary">管理你的学术文档库</Typography.Text>
      </div>

      <div style={{ marginBottom: 20 }}>
        <FileUpload onFileContent={handleUpload} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-faint)' }}>
          加载中...
        </div>
      ) : list.length === 0 ? (
        <Empty
          description={
            <span style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-serif)' }}>
              知识库为空，上传文档开始构建
            </span>
          }
        />
      ) : (
        <div>
          {list.map((doc) => (
            <div key={doc.id} className="wonder-history-card">
              <BookOutlined />
              <div>
                <div className="wonder-history-card__title">{doc.file_name}</div>
                <div className="wonder-history-card__meta">
                  上传于 {new Date(doc.created_at).toLocaleDateString('zh-CN')}
                </div>
              </div>
              <div className="wonder-history-card__actions">
                <Popconfirm title="确认删除此文档？" onConfirm={() => deleteDocument(doc.id)} okText="删除" cancelText="取消">
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </ApiGuard>
  )
}
