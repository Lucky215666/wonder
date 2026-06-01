import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { qaRoutes } from '../../../server/routes/qa'

describe('qaRoutes', () => {
  it('forwards question and knowledge-base context to Python', async () => {
    const storage = {
      getKnowledgeBase: vi.fn(() => ({ id: 'kb-1', readme: '# KB README' })),
      getConfig: vi.fn((key: string) => key === 'globalProfile' ? 'profile' : undefined),
    }
    const python = {
      post: vi.fn(async () => ({
        answer: 'answer',
        source_doc_ids: ['doc-1'],
        source_chunks: ['chunk'],
      })),
    }
    const app = new Hono()
    app.route('/api/qa', qaRoutes(storage as any, python as any))

    const res = await app.request('/api/qa', {
      method: 'POST',
      body: JSON.stringify({ question: 'What is RAG?', knowledgeBaseId: 'kb-1' }),
      headers: { 'Content-Type': 'application/json' },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      answer: 'answer',
      sources: {
        docIds: ['doc-1'],
        chunks: ['chunk'],
      },
    })
    expect(python.post).toHaveBeenCalledWith('/api/knowledge/ask', {
      question: 'What is RAG?',
      knowledge_base_id: 'kb-1',
      knowledge_base_readme: '# KB README',
      global_profile: 'profile',
      top_k_docs: 3,
      top_k_chunks: 5,
    })
  })
})
