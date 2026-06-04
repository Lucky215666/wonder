export type KnowledgeType =
  | 'method'
  | 'theory'
  | 'finding'
  | 'research_question'
  | 'gap'
  | 'limitation'
  | 'writing_material'
  | 'other'

export type AnswerMode = 'general' | 'rag_enhanced' | 'mentioned_docs' | 'compare_docs'

export interface ResearchCardEvidenceRef {
  id?: string
  documentId: string | null
  fileName: string | null
  chunkId: string | null
  chunkIndex: number | null
  chunkType: 'summary' | 'content' | 'card'
  snippet: string
  score: number | null
}

export interface ResearchCardDraft {
  question: string
  coreClaims: string[]
  knowledgeType: KnowledgeType
  tags: string[]
  subDirection: string | null
  validationNotes: string
  useCases: string[]
  linkedDocIds: string[]
  answerMode?: AnswerMode | null
  sourceMessageId?: string | null
  noPaperEvidence: boolean
  evidenceRefs: ResearchCardEvidenceRef[]
}
