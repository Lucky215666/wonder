import { describe, expect, it, vi } from 'vitest'
import { LiteratureParserAgent } from '@/lib/agents/literature'
import type { LLMConfig } from '@/lib/llm/types'

const config: LLMConfig = {
  provider: 'MiniMax',
  apiKey: 'key',
  baseUrl: 'https://api.example.com/v1',
  modelName: 'model',
}

describe('LiteratureParserAgent', () => {
  it('analyzes each chunk then merges', async () => {
    const caller = vi
      .fn()
      .mockResolvedValueOnce('chunk one summary')
      .mockResolvedValueOnce('chunk two summary')
      .mockResolvedValueOnce('# Research Material Reading Card')
    const agent = new LiteratureParserAgent(config, caller)

    const result = await agent.run({ textChunks: ['one', 'two'] })

    expect(caller).toHaveBeenCalledTimes(3)
    expect(result.readingCard).toBe('# Research Material Reading Card')
  })
})
