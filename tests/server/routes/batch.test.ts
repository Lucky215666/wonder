import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { batchRoutes } from '../../../server/routes/batch'

function createApp() {
  const storage = {
    createBatchRun: vi.fn(),
    getBatchRun: vi.fn(),
    getBatchRuns: vi.fn(() => []),
    updateBatchRunStatus: vi.fn(),
    createBatchItem: vi.fn(),
    getBatchItemsByRunId: vi.fn(() => []),
    updateBatchItemStatus: vi.fn(),
  }
  const app = new Hono()
  app.route('/api/batch', batchRoutes(storage as any))
  return { app, storage }
}

describe('batchRoutes', () => {
  describe('POST /api/batch/runs', () => {
    it('should create a run with items', async () => {
      const { app, storage } = createApp()
      let callCount = 0
      storage.getBatchItemsByRunId.mockImplementation(() => {
        callCount++
        return [{ id: `item-${callCount}`, file_name: `file-${callCount}.pdf`, status: 'pending' }]
      })

      const res = await app.request('/api/batch/runs', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Batch',
          files: [{ fileName: 'a.pdf', fileType: 'pdf' }, { fileName: 'b.docx', fileType: 'docx' }],
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('id')
      expect(data.name).toBe('Test Batch')
      expect(storage.createBatchRun).toHaveBeenCalledTimes(1)
      expect(storage.createBatchItem).toHaveBeenCalledTimes(2)
    })

    it('should return 400 for missing name', async () => {
      const { app } = createApp()
      const res = await app.request('/api/batch/runs', {
        method: 'POST',
        body: JSON.stringify({ files: [{ fileName: 'a.pdf' }] }),
        headers: { 'Content-Type': 'application/json' },
      })
      expect(res.status).toBe(400)
    })

    it('should return 400 for empty files', async () => {
      const { app } = createApp()
      const res = await app.request('/api/batch/runs', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', files: [] }),
        headers: { 'Content-Type': 'application/json' },
      })
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/batch/runs', () => {
    it('should return list of runs', async () => {
      const { app, storage } = createApp()
      storage.getBatchRuns.mockReturnValue([
        { id: 'run1', name: 'Batch 1', status: 'done' },
        { id: 'run2', name: 'Batch 2', status: 'pending' },
      ])

      const res = await app.request('/api/batch/runs')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveLength(2)
    })
  })

  describe('GET /api/batch/runs/:id', () => {
    it('should return run with items', async () => {
      const { app, storage } = createApp()
      storage.getBatchRun.mockReturnValue({ id: 'run1', name: 'Test', status: 'done' })
      storage.getBatchItemsByRunId.mockReturnValue([
        { id: 'item1', file_name: 'a.pdf', status: 'done' },
      ])

      const res = await app.request('/api/batch/runs/run1')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.id).toBe('run1')
      expect(data.items).toHaveLength(1)
    })

    it('should return 404 for nonexistent run', async () => {
      const { app, storage } = createApp()
      storage.getBatchRun.mockReturnValue(undefined)

      const res = await app.request('/api/batch/runs/nonexistent')
      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /api/batch/runs/:id', () => {
    it('should update run status', async () => {
      const { app, storage } = createApp()
      storage.getBatchRun.mockReturnValue({ id: 'run1', name: 'Test', status: 'pending' })

      const res = await app.request('/api/batch/runs/run1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'running' }),
        headers: { 'Content-Type': 'application/json' },
      })

      expect(res.status).toBe(200)
      expect(storage.updateBatchRunStatus).toHaveBeenCalledWith('run1', 'running', undefined)
    })

    it('should return 404 for nonexistent run', async () => {
      const { app, storage } = createApp()
      storage.getBatchRun.mockReturnValue(undefined)

      const res = await app.request('/api/batch/runs/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'done' }),
        headers: { 'Content-Type': 'application/json' },
      })
      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /api/batch/runs/:id/items/:itemId', () => {
    it('should update item status', async () => {
      const { app, storage } = createApp()
      storage.getBatchItemsByRunId.mockReturnValue([
        { id: 'item1', file_name: 'a.pdf', status: 'pending' },
      ])

      const res = await app.request('/api/batch/runs/run1/items/item1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'analyzing', documentId: 'doc1' }),
        headers: { 'Content-Type': 'application/json' },
      })

      expect(res.status).toBe(200)
      expect(storage.updateBatchItemStatus).toHaveBeenCalledWith('item1', {
        status: 'analyzing',
        document_id: 'doc1',
        history_id: undefined,
        error: undefined,
        completed_at: undefined,
      })
    })

    it('should return 404 for nonexistent item', async () => {
      const { app, storage } = createApp()
      storage.getBatchItemsByRunId.mockReturnValue([])

      const res = await app.request('/api/batch/runs/run1/items/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'done' }),
        headers: { 'Content-Type': 'application/json' },
      })
      expect(res.status).toBe(404)
    })
  })
})
