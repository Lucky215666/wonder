import { describe, expect, it, vi, afterEach } from 'vitest'
import { PythonBackendClient, PythonBackendUnavailableError } from '../../../server/services/python-backend'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PythonBackendClient', () => {
  it('returns true when health endpoint is ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 'ok' }), { status: 200 })))
    const client = new PythonBackendClient('http://127.0.0.1:8000')

    await expect(client.health()).resolves.toBe(true)
  })

  it('throws stable unavailable error when request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })))
    const client = new PythonBackendClient('http://127.0.0.1:8000')

    await expect(client.post('/api/knowledge/ask', { question: 'q' }))
      .rejects.toBeInstanceOf(PythonBackendUnavailableError)
  })
})
