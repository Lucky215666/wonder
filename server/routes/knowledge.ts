import { Hono } from 'hono'
import { StorageService } from '../services/storage'
import { PythonBackendClient } from '../services/python-backend'

export function knowledgeRoutes(storage: StorageService, python: PythonBackendClient) {
  const app = new Hono()

  app.get('/', (c) => {
    const docs = storage.listDocuments()
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
