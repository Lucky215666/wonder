import { Hono } from 'hono'
import { StorageService } from '../services/storage'
import { PythonBackendClient } from '../services/python-backend'

interface PythonQAResponse {
  answer: string
  source_doc_ids: string[]
  source_chunks: string[]
}

export function qaRoutes(storage: StorageService, python: PythonBackendClient) {
  const app = new Hono()

  app.post('/', async (c) => {
    const body = await c.req.json<{ question: string; knowledgeBaseId?: string }>()
    if (!body.question?.trim()) return c.json({ error: 'Question is required' }, 400)

    const kb = body.knowledgeBaseId ? storage.getKnowledgeBase(body.knowledgeBaseId) : undefined
    const globalProfile = storage.getConfig('globalProfile') || ''

    const result = await python.post<PythonQAResponse>('/api/knowledge/ask', {
      question: body.question,
      knowledge_base_id: body.knowledgeBaseId,
      knowledge_base_readme: kb?.readme || '',
      global_profile: globalProfile,
      top_k_docs: 3,
      top_k_chunks: 5,
    })

    return c.json({
      answer: result.answer,
      sources: {
        docIds: result.source_doc_ids,
        chunks: result.source_chunks,
      },
    })
  })

  return app
}
