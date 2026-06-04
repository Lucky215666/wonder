export interface DiscoveryContext {
  mode: 'knowledge_base' | 'manual'
  knowledgeBaseId?: string
  name: string
  description?: string
  readme?: string
  keywords: string[]
}

export interface DiscoveryCandidate {
  id?: string
  paperId: string
  title: string
  abstract: string | null
  year: number | null
  citationCount: number
  influentialCitationCount?: number
  venue?: string
  authors: Array<{ authorId: string; name: string }>
  url?: string
  sourceQuery: string
  discoveryPriorityScore: number
  discoveryReason: string
  state: 'new' | 'saved' | 'ignored' | 'sent_to_analysis'
  knowledgeBaseId?: string | null
}
