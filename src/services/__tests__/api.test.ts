import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api, ApiError } from '../api'

const mockFetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
})

afterEach(() => {
  vi.restoreAllMocks()
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function textResponse(body: string, status: number) {
  return new Response(body, { status })
}

describe('ApiError', () => {
  it('exposes user-friendly message as Error.message', () => {
    const err = new ApiError({
      status: 500,
      method: 'GET',
      path: '/api/test',
      userMessage: '服务暂时不可用，请稍后重试。',
      debugMessage: 'API GET /api/test failed (500): internal error',
    })
    expect(err.message).toBe('服务暂时不可用，请稍后重试。')
    expect(err.userMessage).toBe('服务暂时不可用，请稍后重试。')
    expect(err.name).toBe('ApiError')
  })

  it('retains debug details', () => {
    const err = new ApiError({
      status: 404,
      method: 'DELETE',
      path: '/api/items/1',
      userMessage: '请求的内容不存在。',
      debugMessage: 'API DELETE /api/items/1 failed (404): not found',
    })
    expect(err.debugMessage).toContain('DELETE')
    expect(err.debugMessage).toContain('404')
    expect(err.status).toBe(404)
    expect(err.method).toBe('DELETE')
    expect(err.path).toBe('/api/items/1')
  })
})

describe('api.get', () => {
  it('returns parsed JSON on success', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }))
    const result = await api.get('/api/test')
    expect(result).toEqual({ ok: true })
  })

  it('throws ApiError with user message for 500', async () => {
    mockFetch.mockResolvedValueOnce(textResponse('internal error', 500))

    try {
      await api.get('/api/test')
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).userMessage).toBe('服务暂时不可用，请稍后重试。')
    }
  })

  it('throws ApiError with user message for 404', async () => {
    mockFetch.mockResolvedValueOnce(textResponse('not found', 404))

    await expect(api.get('/api/test')).rejects.toThrow('请求的内容不存在。')
  })

  it('throws ApiError with user message for 401', async () => {
    mockFetch.mockResolvedValueOnce(textResponse('unauthorized', 401))

    await expect(api.get('/api/test')).rejects.toThrow('认证失败，请检查 API Key 或权限。')
  })

  it('throws ApiError with user message for 403', async () => {
    mockFetch.mockResolvedValueOnce(textResponse('forbidden', 403))

    await expect(api.get('/api/test')).rejects.toThrow('认证失败，请检查 API Key 或权限。')
  })

  it('throws ApiError with user message for 429', async () => {
    mockFetch.mockResolvedValueOnce(textResponse('rate limited', 429))

    await expect(api.get('/api/test')).rejects.toThrow('请求过于频繁，请稍后再试。')
  })

  it('throws ApiError with user message for 400', async () => {
    mockFetch.mockResolvedValueOnce(textResponse('bad request', 400))

    await expect(api.get('/api/test')).rejects.toThrow('请求内容有误，请检查输入。')
  })

  it('extracts debug message from JSON error body', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'specific backend error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    try {
      await api.get('/api/test')
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      const apiErr = err as ApiError
      expect(apiErr.userMessage).toBe('服务暂时不可用，请稍后重试。')
      expect(apiErr.debugMessage).toContain('specific backend error')
    }
  })

  it('falls back to text body for debug message', async () => {
    mockFetch.mockResolvedValueOnce(textResponse('plain text error', 500))

    try {
      await api.get('/api/test')
      expect.unreachable('should have thrown')
    } catch (err) {
      const apiErr = err as ApiError
      expect(apiErr.debugMessage).toContain('plain text error')
    }
  })

  it('throws ApiError on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    try {
      await api.get('/api/test')
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).userMessage).toBe('网络连接失败，请检查服务是否启动。')
    }
  })

  it('includes status undefined for network errors', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    try {
      await api.get('/api/test')
      expect.unreachable('should have thrown')
    } catch (err) {
      const apiErr = err as ApiError
      expect(apiErr.status).toBeUndefined()
      expect(apiErr.method).toBe('GET')
      expect(apiErr.path).toBe('/api/test')
    }
  })
})

describe('api.post', () => {
  it('throws ApiError on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce(textResponse('server error', 502))

    try {
      await api.post('/api/test', { a: 1 })
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).userMessage).toBe('服务暂时不可用，请稍后重试。')
    }
  })
})

describe('api.delete', () => {
  it('throws ApiError on 404', async () => {
    mockFetch.mockResolvedValueOnce(textResponse('not found', 404))

    await expect(api.delete('/api/items/1')).rejects.toThrow('请求的内容不存在。')
  })
})

describe('api.parseFile', () => {
  it('throws ApiError on failure', async () => {
    mockFetch.mockResolvedValueOnce(textResponse('parse error', 400))

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    await expect(api.parseFile(file)).rejects.toThrow(ApiError)
  })

  it('includes debug message from JSON error body', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'unsupported format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const file = new File(['content'], 'test.xyz', { type: 'application/octet-stream' })
    try {
      await api.parseFile(file)
      expect.unreachable('should have thrown')
    } catch (err) {
      const apiErr = err as ApiError
      expect(apiErr.debugMessage).toContain('unsupported format')
    }
  })
})

describe('api.stream', () => {
  it('throws ApiError on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce(textResponse('stream error', 500))

    try {
      await api.stream('/api/analyze', {}, vi.fn())
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).userMessage).toBe('服务暂时不可用，请稍后重试。')
    }
  })

  it('throws ApiError on null body', async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }))

    await expect(api.stream('/api/analyze', {}, vi.fn())).rejects.toThrow(ApiError)
  })
})
