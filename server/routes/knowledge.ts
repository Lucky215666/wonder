import { Hono } from 'hono'
import { StorageService } from '../services/storage'
import { PythonBackendClient } from '../services/python-backend'

export function knowledgeRoutes(storage: StorageService, python: PythonBackendClient) {
  const app = new Hono()

  app.get('/', (c) => {
    const docs = storage.listDocuments()
    return c.json(docs)
  })

  app.get('/documents/search', (c) => {
    const q = (c.req.query('q') || '').trim().toLowerCase()
    const knowledgeBaseId = c.req.query('knowledgeBaseId') || ''
    const limit = Math.min(Number(c.req.query('limit') || 20), 50)

    const docs = storage.listDocuments()
      .filter((doc: any) => !knowledgeBaseId || doc.knowledge_base_id === knowledgeBaseId)
      .filter((doc: any) => {
        if (!q) return true
        const haystack = [
          doc.file_name,
          doc.title,
          doc.authors,
          doc.year != null ? String(doc.year) : '',
        ].filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(q)
      })
      .slice(0, limit)
      .map((doc: any) => ({
        id: doc.id,
        fileName: doc.file_name || doc.title || doc.id,
        title: doc.title || null,
        authors: doc.authors || null,
        year: doc.year || null,
        knowledgeBaseId: doc.knowledge_base_id || null,
        indexedStatus: doc.status || doc.indexed_status || 'unknown',
      }))

    return c.json(docs)
  })

  app.delete('/:id', async (c) => {
    const id = c.req.param('id')
    try {
      await python.delete(`/api/knowledge/documents/${id}`)
    } catch {
      // SQLite remains source of truth; failed index deletion can be retried by reindex tooling.
    }
    storage.deleteChunksByDocument(id)
    storage.deleteDocument(id)
    return c.json({ success: true })
  })

  return app
}
