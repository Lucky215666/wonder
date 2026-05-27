import type { LLMConfig, LLMResponse, Message } from './types'

export class LLMCallError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LLMCallError'
  }
}

export async function callLLM(config: LLMConfig, messages: Message[]): Promise<LLMResponse> {
  if (config.provider === 'Claude/Anthropic') return callAnthropic(config, messages)
  return callOpenAICompatible(config, messages)
}

export async function callLLMStream(
  config: LLMConfig,
  messages: Message[],
  onChunk: (text: string) => void,
): Promise<LLMResponse> {
  if (config.provider === 'Claude/Anthropic') {
    return callAnthropicStream(config, messages, onChunk)
  }
  return callOpenAICompatibleStream(config, messages, onChunk)
}

async function callOpenAICompatible(config: LLMConfig, messages: Message[]): Promise<LLMResponse> {
  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.modelName,
      messages,
      temperature: 0.2,
      max_tokens: 3500,
    }),
  })
  const data = await readJsonResponse(response)
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new LLMCallError('Model returned empty response.')
  return {
    content,
    usage: data.usage
      ? { prompt: data.usage.prompt_tokens ?? 0, completion: data.usage.completion_tokens ?? 0 }
      : undefined,
  }
}

async function callOpenAICompatibleStream(
  config: LLMConfig,
  messages: Message[],
  onChunk: (text: string) => void,
): Promise<LLMResponse> {
  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.modelName,
      messages,
      temperature: 0.2,
      max_tokens: 3500,
      stream: true,
    }),
  })
  return readSse(response, line => {
    const delta = line.choices?.[0]?.delta?.content ?? ''
    if (delta) onChunk(delta)
    return delta
  })
}

async function callAnthropic(config: LLMConfig, messages: Message[]): Promise<LLMResponse> {
  const system = messages.find(message => message.role === 'system')?.content ?? ''
  const userMessages = messages.filter(message => message.role !== 'system')
  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.modelName,
      system,
      messages: userMessages,
      temperature: 0.2,
      max_tokens: 3500,
    }),
  })
  const data = await readJsonResponse(response)
  const content = (data.content ?? [])
    .filter((item: { type: string }) => item.type === 'text')
    .map((item: { text: string }) => item.text)
    .join('\n')
    .trim()
  if (!content) throw new LLMCallError('Model returned empty response.')
  return { content }
}

async function callAnthropicStream(
  config: LLMConfig,
  messages: Message[],
  onChunk: (text: string) => void,
): Promise<LLMResponse> {
  const system = messages.find(message => message.role === 'system')?.content ?? ''
  const userMessages = messages.filter(message => message.role !== 'system')
  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.modelName,
      system,
      messages: userMessages,
      temperature: 0.2,
      max_tokens: 3500,
      stream: true,
    }),
  })
  return readSse(response, line => {
    const delta = line.type === 'content_block_delta' ? line.delta?.text ?? '' : ''
    if (delta) onChunk(delta)
    return delta
  })
}

async function readJsonResponse(response: Response): Promise<any> {
  if (!response.ok) {
    const body = await response.text()
    throw new LLMCallError(`LLM request failed: HTTP ${response.status} ${body}`)
  }
  return response.json()
}

async function readSse(response: Response, extract: (line: any) => string): Promise<LLMResponse> {
  if (!response.ok || !response.body) {
    const body = await response.text()
    throw new LLMCallError(`LLM stream failed: HTTP ${response.status} ${body}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      const chunk = extract(JSON.parse(payload))
      content += chunk
    }
  }

  if (!content.trim()) throw new LLMCallError('Model returned empty response.')
  return { content }
}
