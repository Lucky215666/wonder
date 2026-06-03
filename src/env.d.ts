/// <reference types="vite/client" />

declare module 'react-markdown' {
  import type { ComponentType } from 'react'
  interface ReactMarkdownProps {
    children: string
    [key: string]: unknown
  }
  const ReactMarkdown: ComponentType<ReactMarkdownProps>
  export default ReactMarkdown
}

declare module 'remark-gfm' {
  const remarkGfm: unknown
  export default remarkGfm
}
