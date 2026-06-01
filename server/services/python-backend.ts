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
      throw new PythonBackendUnavailableError(`Python backend ${method} ${path} failed (${res.status}): ${text}`)
    }

    return res.json() as Promise<T>
  }
}
