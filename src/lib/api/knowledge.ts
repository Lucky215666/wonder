import { apiGet, apiPost, apiPostForm, apiDelete } from './client'

// Types matching backend schemas.py
export interface KnowledgeDoc {
  id: string
  file_name: string
  created_at: string
  summary: string
  chunk_count: number
  total_tokens: number
}

export interface KnowledgeDocDetail extends KnowledgeDoc {
  reading_card: string
  relation_analysis: string
  writing_materials: string
  todo_list: string
}

export interface KnowledgeSearchResult {
  id: string
  document: string
  metadata: Record<string, unknown>
  distance: number
}

export interface KnowledgeQAResponse {
  answer: string
  source_doc_ids: string[]
  source_chunks: string[]
}

export interface DocumentListResponse {
  documents: KnowledgeDoc[]
  total: number
}

export interface SearchResponse {
  results: KnowledgeSearchResult[]
}

export async function uploadDocument(file: File): Promise<{ doc_id: string }> {
  const form = new FormData()
  form.append('file', file)
  return apiPostForm('/api/knowledge/documents', form)
}

export async function listDocuments(): Promise<DocumentListResponse> {
  return apiGet('/api/knowledge/documents')
}

export async function getDocument(docId: string): Promise<KnowledgeDocDetail> {
  return apiGet(`/api/knowledge/documents/${docId}`)
}

export async function deleteDocument(docId: string): Promise<void> {
  await apiDelete(`/api/knowledge/documents/${docId}`)
}

export async function askQuestion(
  question: string,
  docIds?: string[],
): Promise<KnowledgeQAResponse> {
  return apiPost('/api/knowledge/ask', { question, doc_ids: docIds })
}

export async function searchKnowledge(
  query: string,
  docIds?: string[],
  topK = 10,
): Promise<SearchResponse> {
  return apiPost('/api/knowledge/search', { query, doc_ids: docIds, top_k: topK })
}
