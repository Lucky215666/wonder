import { useState } from 'react'
import { InboxOutlined, FileTextOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { message } from 'antd'

interface Props {
  onFileContent: (fileName: string, fileType: string, content: string) => void
  disabled?: boolean
}

export default function FileUpload({ onFileContent, disabled }: Props) {
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  const processFile = async (file: File) => {
    if (disabled) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'txt' || ext === 'md') {
      const text = await file.text()
      setSelectedFile(file.name)
      onFileContent(file.name, ext, text)
    } else if (ext === 'pdf') {
      const text = `[PDF file: ${file.name}] - parsing not yet integrated`
      setSelectedFile(file.name)
      onFileContent(file.name, 'pdf', text)
    } else if (ext === 'docx') {
      const text = `[DOCX file: ${file.name}] - parsing not yet integrated`
      setSelectedFile(file.name)
      onFileContent(file.name, 'docx', text)
    } else {
      message.error('不支持的文件格式')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleClick = () => {
    if (disabled) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.docx,.txt,.md'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) processFile(file)
    }
    input.click()
  }

  if (selectedFile) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '14px 16px',
        background: 'var(--accent-light)',
        border: '1px solid var(--accent)',
        borderRadius: 'var(--radius-card)',
        gap: 12,
      }}>
        <FileTextOutlined style={{ fontSize: 20, color: 'var(--accent)' }} />
        <span style={{ flex: 1, color: 'var(--ink-dense)', fontWeight: 500, fontSize: 14 }}>
          {selectedFile}
        </span>
        {!disabled && (
          <CloseCircleOutlined
            style={{ color: 'var(--ink-faint)', cursor: 'pointer', fontSize: 16 }}
            onClick={() => setSelectedFile(null)}
          />
        )}
      </div>
    )
  }

  return (
    <div
      className={`wonder-upload-zone ${dragging ? 'dragging' : ''} ${disabled ? 'wonder-upload-zone--disabled' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <div className="wonder-upload-icon"><InboxOutlined /></div>
      <div className="wonder-upload-text">点击或拖拽文件到此处</div>
      <div className="wonder-upload-hint">支持 PDF、DOCX、TXT、Markdown 格式</div>
    </div>
  )
}
