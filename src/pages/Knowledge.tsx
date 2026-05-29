import { useEffect } from 'react'
import { Card, Typography, List, Button, Popconfirm, message } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { useKnowledgeStore } from '../stores/knowledge'
import FileUpload from '../components/FileUpload'

export default function Knowledge() {
  const { documents, loading, loadDocuments, deleteDocument } = useKnowledgeStore()

  useEffect(() => { loadDocuments() }, [loadDocuments])

  const handleUpload = async (fileName: string, fileType: string, content: string) => {
    message.info('知识库上传功能待集成')
  }

  return (
    <div>
      <Typography.Title level={4}>知识库</Typography.Title>
      <Card>
        <FileUpload onFileContent={handleUpload} />
      </Card>
      <Card style={{ marginTop: 16 }}>
        <List
          loading={loading}
          dataSource={documents as { id: string; file_name: string; created_at: string }[]}
          renderItem={(doc) => (
            <List.Item
              actions={[
                <Popconfirm title="确认删除？" onConfirm={() => deleteDocument(doc.id)} key="del">
                  <Button icon={<DeleteOutlined />} danger size="small" />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={doc.file_name}
                description={`上传于 ${new Date(doc.created_at).toLocaleDateString('zh-CN')}`}
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  )
}
