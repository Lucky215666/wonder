export class PythonBackendUnavailableError extends Error {
  code = 'PYTHON_BACKEND_UNAVAILABLE'

  constructor(message = 'Python AI Core is unavailable') {
    super(message)
    this.name = 'PythonBackendUnavailableError'
  }
}

export class PythonBackendClient {
  constructor(private readonly baseUrl = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000') {}

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(3000) })
      return res.ok
    } catch {
      return false
    }
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path)
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path)
  }

  async *postSSE(path: string, body: unknown, signal?: AbortSignal): AsyncGenerator<{ event: string; data: string }> {
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      })
    } catch (err) {
      if (signal?.aborted) throw err
      throw new PythonBackendUnavailableError(err instanceof Error ? err.message : String(err))
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new PythonBackendUnavailableError(`Python backend POST ${path} failed (${res.status}): ${text}`)
    }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let currentEvent = 'message'

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()!

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            yield { event: currentEvent, data: line.slice(6) }
            currentEvent = 'message'
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(120000),
      })
    } catch (err) {
      throw new PythonBackendUnavailableError(err instanceof Error ? err.message : String(err))
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      let detail: string = text
      try {
        const parsed = JSON.parse(text)
        const raw = parsed.detail || parsed.message
        detail = typeof raw === 'string' ? raw : (raw != null ? JSON.stringify(raw) : text)
      } catch { /* not JSON, use raw text */ }
      throw new PythonBackendUnavailableError(detail)
    }

    return res.json() as Promise<T>
  }
}
