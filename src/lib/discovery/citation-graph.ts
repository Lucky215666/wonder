import { api } from '../../services/api'

export interface GraphNode {
  paperId: string
  title: string
  year: number | null
  citationCount: number
  influentialCitationCount?: number
  abstract?: string | null
  venue?: string
  authors?: Array<{ authorId: string; name: string }>
  url?: string
  x: number
  y: number
}

export interface GraphEdge {
  from: string
  to: string
  type: 'references' | 'citations'
}

export interface CitationGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

interface ApiNode {
  paperId: string
  title: string
  abstract: string | null
  year: number | null
  citationCount: number
  influentialCitationCount: number
  venue: string
  authors: Array<{ authorId: string; name: string }>
  url: string
}

interface ApiResponse {
  nodes: ApiNode[]
  edges: Array<{ from: string; to: string; type: string }>
}

/**
 * Build a citation graph via the Node API (which caches in SQLite and proxies Semantic Scholar).
 */
export async function buildCitationGraph(
  seedPaperId: string,
  depth: number = 1,
  limit: number = 10,
): Promise<CitationGraph> {
  const params = new URLSearchParams({
    paperId: seedPaperId,
    depth: String(depth),
    limit: String(limit),
    direction: 'both',
  })

  const data = await api.get<ApiResponse>(`/api/citation/graph?${params}`)

  const nodes: GraphNode[] = data.nodes.map(n => ({
    paperId: n.paperId,
    title: n.title,
    year: n.year,
    citationCount: n.citationCount,
    influentialCitationCount: n.influentialCitationCount,
    abstract: n.abstract,
    venue: n.venue,
    authors: n.authors,
    url: n.url,
    x: 0,
    y: 0,
  }))

  const edges: GraphEdge[] = data.edges.map(e => ({
    from: e.from,
    to: e.to,
    type: e.type as 'references' | 'citations',
  }))

  assignPositions(nodes, seedPaperId)

  return { nodes, edges }
}

/**
 * Assign x/y positions using concentric circular layout.
 */
function assignPositions(nodes: GraphNode[], seedId: string): void {
  const seedNode = nodes.find(n => n.paperId === seedId)
  if (!seedNode) return

  const others = nodes.filter(n => n.paperId !== seedId)
  const cx = 400
  const cy = 300
  const radius = others.length <= 12 ? 200 : 260

  seedNode.x = cx
  seedNode.y = cy

  for (let i = 0; i < others.length; i++) {
    const angle = (2 * Math.PI * i) / others.length - Math.PI / 2
    others[i].x = cx + radius * Math.cos(angle)
    others[i].y = cy + radius * Math.sin(angle)
  }
}
