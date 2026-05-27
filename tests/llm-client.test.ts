import { describe, expect, it, vi, afterEach } from 'vitest'
import { callLLM, callLLMStream } from '@/lib/llm/client'
import type { LLMConfig } from '@/lib/llm/types'

const openAiConfig: LLMConfig = {
  provider: 'DeepSeek',
  apiKey: 'key',
  baseUrl: 'https://api.example.com/v1',
  modelName: 'model',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('LLM client', () => {
  it('calls OpenAI-compatible chat completions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'hello' } }],
        usage: { prompt_tokens: 1, completion_tokens: 2 },
      }),
    }))

    const result = await callLLM(openAiConfig, [{ role: 'user', content: 'hi' }])

    expect(result.content).toBe('hello')
    expect(result.usage).toEqual({ prompt: 1, completion: 2 })
    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('parses OpenAI-compatible SSE chunks', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"he"}}]}\n\n'))
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"llo"}}]}\n\n'))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: stream }))

    const chunks: string[] = []
    const result = await callLLMStream(openAiConfig, [{ role: 'user', content: 'hi' }], text => chunks.push(text))

    expect(chunks).toEqual(['he', 'llo'])
    expect(result.content).toBe('hello')
  })

  it('throws LLMCallError on HTTP failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    }))

    await expect(callLLM(openAiConfig, [{ role: 'user', content: 'hi' }])).rejects.toThrow('LLM request failed: HTTP 500')
  })

  it('throws LLMCallError on empty response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '' } }] }),
    }))

    await expect(callLLM(openAiConfig, [{ role: 'user', content: 'hi' }])).rejects.toThrow('Model returned empty response.')
  })
})
