import { Hono } from 'hono'
import { StorageService } from '../services/storage'
import { randomUUID } from 'crypto'
import { OA_BASE, oaFetch, mapWorkToPaper, type OaWork, type Paper } from '../services/openalex'

async function fetchPaper(paperId: string): Promise<Paper> {
  const id = paperId.startsWith('W') ? paperId : `W${paperId}`
  const url = `${OA_BASE}/works/${encodeURIComponent(id)}`
  const res = await oaFetch(url, 10000)
  if (!res.ok) throw new Error(`OpenAlex API error: ${res.status}`)
  const work: OaWork = await res.json()
  const paper = mapWorkToPaper(work)
  if (!paper) throw new Error('论文数据无效')
  return paper
}

async function fetchReferences(work: OaWork, limit: number): Promise<Paper[]> {
  const refIds = (work.referenced_works ?? []).slice(0, limit)
  if (refIds.length === 0) return []
  const filter = refIds.map(id => id.replace('https://openalex.org/', '')).join('|')
  const url = `${OA_BASE}/works?filter=openalex:${filter}&per_page=${limit}`
  const res = await oaFetch(url)
  if (!res.ok) throw new Error(`OpenAlex API error: ${res.status}`)
  const data = await res.json()
  return (data.results ?? []).map(mapWorkToPaper).filter(Boolean) as Paper[]
}

async function fetchCitations(workId: string, limit: number): Promise<Paper[]> {
  const id = workId.startsWith('W') ? workId : `W${workId}`
  const url = `${OA_BASE}/works?filter=cites:${id}&per_page=${limit}`
  const res = await oaFetch(url)
  if (!res.ok) throw new Error(`OpenAlex API error: ${res.status}`)
  const data = await res.json()
  return (data.results ?? []).map(mapWorkToPaper).filter(Boolean) as Paper[]
}

async function fetchWorkRaw(paperId: string): Promise<OaWork> {
  const id = paperId.startsWith('W') ? paperId : `W${paperId}`
  const url = `${OA_BASE}/works/${encodeURIComponent(id)}`
  const res = await oaFetch(url, 10000)
  if (!res.ok) throw new Error(`OpenAlex API error: ${res.status}`)
  return res.json()
}

function cachePaperNode(storage: StorageService, paper: Paper) {
  storage.upsertPaperNode({
    paperId: paper.paperId,
    title: paper.title,
    abstract: paper.abstract,
    year: paper.year,
    citationCount: paper.citationCount,
    venue: paper.venue || null,
    authors: paper.authors ? JSON.stringify(paper.authors) : null,
    url: paper.url || null,
  })
}

export function citationRoutes(storage: StorageService) {
  const app = new Hono()

  app.get('/graph', async (c) => {
    const paperId = c.req.query('paperId')
    if (!paperId) return c.json({ error: '缺少 paperId 参数' }, 400)

    const depth = Math.min(2, Math.max(1, parseInt(c.req.query('depth') ?? '1', 10)))
    const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') ?? '15', 10)))
    const direction = c.req.query('direction') ?? 'both'

    try {
      // Fetch seed paper (raw for referenced_works, mapped for response)
      const seedRaw = await fetchWorkRaw(paperId)
      const seed = mapWorkToPaper(seedRaw)
      if (!seed) return c.json({ error: '论文数据无效' }, 404)
      cachePaperNode(storage, seed)

      const nodesMap = new Map<string, Paper>()
      nodesMap.set(seed.paperId, seed)
      const rawMap = new Map<string, OaWork>()
      rawMap.set(seed.paperId, seedRaw)
      const edges: Array<{ id: string; from: string; to: string; type: string }> = []
      const visited = new Set<string>([seed.paperId])

      // BFS queue: store paperId and depth
      const queue: Array<{ id: string; d: number }> = [{ id: seed.paperId, d: 0 }]

      while (queue.length > 0) {
        const { id, d } = queue.shift()!
        if (d >= depth) continue

        const raw = rawMap.get(id)
        const fetchTasks: Promise<Paper[]>[] = []
        if (direction === 'both' || direction === 'references') {
          fetchTasks.push(raw ? fetchReferences(raw, limit).catch(() => []) : Promise.resolve([]))
        } else {
          fetchTasks.push(Promise.resolve([]))
        }
        if (direction === 'both' || direction === 'citations') {
          fetchTasks.push(fetchCitations(id, limit).catch(() => []))
        } else {
          fetchTasks.push(Promise.resolve([]))
        }

        const [refs, cits] = await Promise.all(fetchTasks)

        for (const paper of refs) {
          if (!paper.paperId) continue
          cachePaperNode(storage, paper)
          nodesMap.set(paper.paperId, paper)
          storage.insertPaperEdge({
            id: randomUUID(),
            fromPaperId: id,
            toPaperId: paper.paperId,
            type: 'references',
            sourceSeedPaperId: seed.paperId,
          })
          edges.push({ id: `${id}->${paper.paperId}:references`, from: id, to: paper.paperId, type: 'references' })
          if (!visited.has(paper.paperId)) {
            visited.add(paper.paperId)
            queue.push({ id: paper.paperId, d: d + 1 })
          }
        }

        for (const paper of cits) {
          if (!paper.paperId) continue
          cachePaperNode(storage, paper)
          nodesMap.set(paper.paperId, paper)
          storage.insertPaperEdge({
            id: randomUUID(),
            fromPaperId: paper.paperId,
            toPaperId: id,
            type: 'citations',
            sourceSeedPaperId: seed.paperId,
          })
          edges.push({ id: `${paper.paperId}->${id}:citations`, from: paper.paperId, to: id, type: 'citations' })
          if (!visited.has(paper.paperId)) {
            visited.add(paper.paperId)
            queue.push({ id: paper.paperId, d: d + 1 })
          }
        }
      }

      // Deduplicate edges
      const edgeSet = new Set<string>()
      const uniqueEdges = edges.filter(e => {
        const key = `${e.from}->${e.to}:${e.type}`
        if (edgeSet.has(key)) return false
        edgeSet.add(key)
        return true
      })

      const nodes = Array.from(nodesMap.values()).map(p => ({
        paperId: p.paperId,
        title: p.title,
        abstract: p.abstract,
        year: p.year,
        citationCount: p.citationCount,
        influentialCitationCount: p.influentialCitationCount ?? 0,
        venue: p.venue,
        authors: p.authors,
        url: p.url,
      }))

      return c.json({ nodes, edges: uniqueEdges })
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : '获取引用数据失败' }, 502)
    }
  })

  return app
}
