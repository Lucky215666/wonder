const BASE = ''

export class ApiError extends Error {
  status?: number
  method: string
  path: string
  userMessage: string
  debugMessage: string

  constructor(args: { status?: number; method: string; path: string; userMessage: string; debugMessage: string }) {
    super(args.userMessage)
    this.name = 'ApiError'
    this.status = args.status
    this.method = args.method
    this.path = args.path
    this.userMessage = args.userMessage
    this.debugMessage = args.debugMessage
  }
}

function userMessageForStatus(status?: number): string {
  if (!status) return '网络连接失败，请检查服务是否启动。'
  if (status === 400) return '请求内容有误，请检查输入。'
  if (status === 401 || status === 403) return '认证失败，请检查 API Key 或权限。'
  if (status === 404) return '请求的内容不存在。'
  if (status === 429) return '请求过于频繁，请稍后再试。'
  if (status >= 500) return '服务暂时不可用，请稍后重试。'
  return `请求失败 (${status})。`
}

function parseDebugMessage(text: string): string {
  try {
    const data = JSON.parse(text)
    return data.error || text
  } catch {
    return text
  }
}

async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch {
    throw new ApiError({
      method,
      path,
      userMessage: userMessageForStatus(undefined),
      debugMessage: `API ${method} ${path} failed: network error`,
    })
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new ApiError({
      status: res.status,
      method,
      path,
      userMessage: userMessageForStatus(res.status),
      debugMessage: `API ${method} ${path} failed (${res.status}): ${parseDebugMessage(text)}`,
    })
  }
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>('GET', path, undefined, signal),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) => request<T>('POST', path, body, signal),
  put: <T>(path: string, body?: unknown, signal?: AbortSignal) => request<T>('PUT', path, body, signal),
  patch: <T>(path: string, body?: unknown, signal?: AbortSignal) => request<T>('PATCH', path, body, signal),
  delete: <T>(path: string, signal?: AbortSignal) => request<T>('DELETE', path, undefined, signal),

  parseFile: async (file: File): Promise<{ text: string; fileName: string; pdfTitle?: string }> => {
    const form = new FormData()
    form.append('file', file)
    let res: Response
    try {
      res = await fetch(`${BASE}/api/files/parse`, { method: 'POST', body: form })
    } catch {
      throw new ApiError({
        method: 'POST',
        path: '/api/files/parse',
        userMessage: userMessageForStatus(undefined),
        debugMessage: 'POST /api/files/parse failed: network error',
      })
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new ApiError({
        status: res.status,
        method: 'POST',
        path: '/api/files/parse',
        userMessage: userMessageForStatus(res.status),
        debugMessage: `POST /api/files/parse failed (${res.status}): ${parseDebugMessage(text)}`,
      })
    }
    return res.json()
  },

  healthCheck: async (): Promise<{ ok: boolean; llm: boolean; python: boolean }> => {
    const [llmRes, pythonRes] = await Promise.allSettled([
      fetch(`${BASE}/api/health/llm`, { signal: AbortSignal.timeout(5000) }),
      fetch(`${BASE}/api/health/ai-core`, { signal: AbortSignal.timeout(5000) }),
    ])
    const llm = llmRes.status === 'fulfilled' && llmRes.value.ok
    const python = pythonRes.status === 'fulfilled' && pythonRes.value.ok
    return { ok: llm && python, llm, python }
  },

  stream: async (
    path: string,
    body: unknown,
    onEvent: (event: string, data: string) => void,
    signal?: AbortSignal,
  ) => {
    let res: Response
    try {
      res = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      })
    } catch {
      throw new ApiError({
        method: 'POST',
        path,
        userMessage: userMessageForStatus(undefined),
        debugMessage: `POST ${path} failed: network error`,
      })
    }
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '')
      throw new ApiError({
        status: res.status,
        method: 'POST',
        path,
        userMessage: userMessageForStatus(res.status),
        debugMessage: `POST ${path} failed (${res.status}): ${parseDebugMessage(text)}`,
      })
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('event: ')) {
          const event = lines[i].slice(7).trim()
          const dataLine = lines[i + 1]
          if (dataLine?.startsWith('data: ')) {
            onEvent(event, dataLine.slice(6))
          }
        }
      }
    }
  },
}
