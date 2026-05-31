const BASE = ''

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${method} ${path} failed (${res.status}): ${text}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),

  healthCheck: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${BASE}/api/health/llm`, {
        signal: AbortSignal.timeout(5000),
      })
      return res.ok
    } catch {
      return false
    }
  },

  stream: async (
    path: string,
    body: unknown,
    onEvent: (event: string, data: string) => void,
    signal?: AbortSignal,
  ) => {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '')
      throw new Error(`Stream ${path} failed (${res.status}): ${text}`)
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

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          const event = line.slice(7).trim()
          const dataLine = lines[lines.indexOf(line) + 1]
          if (dataLine?.startsWith('data: ')) {
            onEvent(event, dataLine.slice(6))
          }
        }
      }
    }
  },
}
