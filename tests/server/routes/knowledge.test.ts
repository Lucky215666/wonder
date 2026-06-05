import { describe, expect, it, vi } from 'vitest'
import { knowledgeRoutes } from '../../../server/routes/knowledge'

describe('knowledgeRoutes document search', () => {
  it('returns documents for an empty mention query', async () => {
    const storage = {
      listDocuments: vi.fn(() => [
        {
          id: 'doc-1',
          file_name: 'attention.pdf',
          title: 'Attention Is All You Need',
          authors: 'Vaswani et al.',
          year: 2017,
          knowledge_base_id: 'kb-1',
          status: 'indexed',
          created_at: '2026-06-01T00:00:00Z',
        },
      ]),
    }
    const app = knowledgeRoutes(storage as any, { delete: vi.fn() } as any)

    const res = await app.request('/documents/search?q=&knowledgeBaseId=kb-1')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([
      expect.objectContaining({
        id: 'doc-1',
        fileName: 'attention.pdf',
        title: 'Attention Is All You Need',
        authors: 'Vaswani et al.',
        year: 2017,
        knowledgeBaseId: 'kb-1',
        indexedStatus: 'indexed',
      }),
    ])
  })

  it('filters by file name, title, authors, and year', async () => {
    const storage = {
      listDocuments: vi.fn(() => [
        { id: 'doc-1', file_name: 'attention.pdf', title: 'Attention Is All You Need', authors: 'Vaswani', year: 2017, knowledge_base_id: 'kb-1', status: 'indexed' },
        { id: 'doc-2', file_name: 'bert.pdf', title: 'BERT', authors: 'Devlin', year: 2018, knowledge_base_id: 'kb-1', status: 'indexed' },
      ]),
    }
    const app = knowledgeRoutes(storage as any, { delete: vi.fn() } as any)

    const res = await app.request('/documents/search?q=vaswani&knowledgeBaseId=kb-1')
    const body = await res.json()
    expect(body.map((d: any) => d.id)).toEqual(['doc-1'])
  })
})
