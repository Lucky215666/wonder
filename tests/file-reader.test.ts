import { describe, expect, it } from 'vitest'
import { cleanText, readTextBytes } from '@/lib/core/file-reader'

describe('file-reader text helpers', () => {
  it('reads utf-8 text bytes', async () => {
    const bytes = new TextEncoder().encode('你好\nworld')
    await expect(readTextBytes(bytes)).resolves.toBe('你好\nworld')
  })

  it('normalizes excessive blank lines and full-width spaces', () => {
    expect(cleanText('hello　world\n\n\n\nnext')).toBe('hello world\n\nnext')
  })
})
