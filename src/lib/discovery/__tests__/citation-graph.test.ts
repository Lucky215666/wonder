import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()
vi.mock('../../../services/api', () => ({
  api: { get: (...args: unknown[]) => mockGet(...args) },
}))

import { buildCitationGraph } from '../citation-graph'

describe('buildCitationGraph', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it('should call /api/citation/graph with correct params', async () => {
    mockGet.mockResolvedValue({ nodes: [], edges: [] })

    await buildCitationGraph('seed-1', 1, 15)

    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('paperId=seed-1'),
    )
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('depth=1'),
    )
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('limit=15'),
    )
  })

  it('should map API response to CitationGraph with positions', async () => {
    mockGet.mockResolvedValue({
      nodes: [
        { paperId: 'seed', title: 'Seed', abstract: null, year: 2024, citationCount: 10, venue: '', authors: [], url: '' },
        { paperId: 'ref1', title: 'Ref 1', abstract: null, year: 2023, citationCount: 5, venue: '', authors: [], url: '' },
      ],
      edges: [
        { from: 'seed', to: 'ref1', type: 'references' },
      ],
    })

    const graph = await buildCitationGraph('seed', 1, 10)

    expect(graph.nodes).toHaveLength(2)
    expect(graph.edges).toHaveLength(1)
    // Seed should be at center
    const seed = graph.nodes.find(n => n.paperId === 'seed')!
    expect(seed.x).toBe(400)
    expect(seed.y).toBe(300)
    // Other node should be positioned above center (angle = -PI/2)
    const ref = graph.nodes.find(n => n.paperId === 'ref1')!
    expect(ref.x).toBeCloseTo(400, 0)
    expect(ref.y).toBeLessThan(300)
  })

  it('should preserve abstract and authors from API', async () => {
    mockGet.mockResolvedValue({
      nodes: [
        {
          paperId: 'p1', title: 'Paper', abstract: 'Test abstract',
          year: 2024, citationCount: 10, venue: 'ICML',
          authors: [{ authorId: 'a1', name: 'Author' }],
          url: 'https://example.com',
        },
      ],
      edges: [],
    })

    const graph = await buildCitationGraph('p1')
    expect(graph.nodes[0].abstract).toBe('Test abstract')
    expect(graph.nodes[0].authors).toEqual([{ authorId: 'a1', name: 'Author' }])
    expect(graph.nodes[0].venue).toBe('ICML')
  })

  it('should handle empty graph', async () => {
    mockGet.mockResolvedValue({ nodes: [], edges: [] })
    const graph = await buildCitationGraph('nonexistent')
    expect(graph.nodes).toHaveLength(0)
    expect(graph.edges).toHaveLength(0)
  })
})
