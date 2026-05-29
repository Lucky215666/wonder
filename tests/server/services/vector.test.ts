import { describe, it, expect } from 'vitest'
import { cosineSimilarity, searchVectors } from '../../../server/services/vector'

describe('vector', () => {
  it('should compute cosine similarity of identical vectors', () => {
    const v = new Float32Array([1, 0, 0])
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0)
  })

  it('should compute cosine similarity of orthogonal vectors', () => {
    const a = new Float32Array([1, 0, 0])
    const b = new Float32Array([0, 1, 0])
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0)
  })

  it('should compute cosine similarity of opposite vectors', () => {
    const a = new Float32Array([1, 0])
    const b = new Float32Array([-1, 0])
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0)
  })

  it('should find top-k most similar vectors', () => {
    const query = new Float32Array([1, 0, 0])
    const candidates = [
      { id: 'a', embedding: new Float32Array([1, 0, 0]) },
      { id: 'b', embedding: new Float32Array([0, 1, 0]) },
      { id: 'c', embedding: new Float32Array([0.7, 0.7, 0]) },
    ]
    const results = searchVectors(query, candidates, 2)
    expect(results[0].id).toBe('a')
    expect(results[1].id).toBe('c')
  })
})
