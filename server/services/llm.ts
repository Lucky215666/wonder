import { StorageService } from './storage'

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export class LLMService {
  private storage: StorageService

  constructor(storage: StorageService) {
    this.storage = storage
  }

  private getAppConfig(): { apiKey: string; baseUrl: string; model: string } {
    const raw = this.storage.getConfig('appConfig')
    if (!raw) throw new Error('App config not found, please configure in Settings')
    const cfg = JSON.parse(raw)
    if (!cfg.apiKey) throw new Error('LLM API key not configured')
    return {
      apiKey: cfg.apiKey,
      baseUrl: cfg.baseUrl || 'https://api.anthropic.com',
      model: cfg.model || 'claude-sonnet-4-20250514',
    }
  }

  async call(messages: LLMMessage[], systemPrompt?: string): Promise<string> {
    const { apiKey, baseUrl, model } = this.getAppConfig()

    // Build Anthropic Messages API request
    const body: Record<string, unknown> = {
      model,
      max_tokens: 4096,
      messages: messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content })),
    }
    if (systemPrompt) {
      body.system = systemPrompt
    }

    const resp = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    if (!resp.ok) {
      throw new Error(`LLM API error: ${resp.status} ${await resp.text()}`)
    }

    const data = await resp.json() as {
      content: { type: string; text?: string }[]
    }
    return data.content
      .filter(c => c.type === 'text')
      .map(c => c.text ?? '')
      .join('')
  }

  async healthCheck(): Promise<boolean> {
    try {
      const { apiKey, baseUrl, model } = this.getAppConfig()
      const resp = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      })
      return resp.ok
    } catch {
      return false
    }
  }

  async *callStream(messages: LLMMessage[], systemPrompt?: string): AsyncGenerator<string> {
    const { apiKey, baseUrl, model } = this.getAppConfig()

    const body: Record<string, unknown> = {
      model,
      max_tokens: 4096,
      messages: messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content })),
      stream: true,
    }
    if (systemPrompt) {
      body.system = systemPrompt
    }

    const resp = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    if (!resp.ok) {
      throw new Error(`LLM API error: ${resp.status} ${await resp.text()}`)
    }

    const reader = resp.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        try {
          const parsed = JSON.parse(data) as {
            type: string
            delta?: { type: string; text?: string }
          }
          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            yield parsed.delta.text ?? ''
          }
        } catch {
          // skip malformed JSON lines
        }
      }
    }
  }
}
