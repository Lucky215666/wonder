import { describe, it, expect } from 'vitest'
import { chunkText, estimateTokens } from '../../../server/services/chunker'

describe('chunker', () => {
  it('should return single chunk for short text', () => {
    const chunks = chunkText('hello world')
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toBe('hello world')
  })

  it('should split long text into chunks with overlap', () => {
    const text = 'a'.repeat(15000)
    const chunks = chunkText(text, 7000, 500)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0]).toHaveLength(7000)
  })

  it('should estimate tokens roughly', () => {
    const tokens = estimateTokens('hello world test')
    expect(tokens).toBe(Math.floor(16 / 1.5))
  })
})
