import { describe, expect, it } from 'vitest'
import { chunkText, estimateTokens } from '@/lib/core/chunker'

describe('chunkText', () => {
  it('returns one chunk for short text', () => {
    expect(chunkText('hello', 100, 10)).toEqual(['hello'])
  })

  it('splits long text with overlap', () => {
    const text = 'a'.repeat(2000)
    const chunks = chunkText(text, 1000, 100)
    expect(chunks).toHaveLength(3)
    expect(chunks[1]).toHaveLength(1000)
    expect(chunks[1].slice(0, 100)).toBe(text.slice(900, 1000))
  })

  it('rejects invalid overlap', () => {
    expect(() => chunkText('abc', 100, 100)).toThrow('overlap must be smaller')
  })
})

describe('estimateTokens', () => {
  it('estimates by char length', () => {
    expect(estimateTokens('a'.repeat(300))).toBe(200)
  })
})
