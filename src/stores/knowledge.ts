import { create } from 'zustand'
import { api } from '../services/api'
import type { KnowledgeBase } from '../types/analysis'

interface KnowledgeState {
  // KB list
  knowledgeBases: KnowledgeBase[]
  kbLoading: boolean
  loadKnowledgeBases: () => Promise<void>
  createKnowledgeBase: (name: string, description?: string, readme?: string) => Promise<KnowledgeBase>
  updateKnowledgeBase: (id: string, updates: { name?: string; description?: string; readme?: string }) => Promise<void>
  deleteKnowledgeBase: (id: string) => Promise<void>

  // Selected KB
  selectedKBId: string | null
  selectKB: (id: string | null) => void

  // Documents in selected KB
  kbDocuments: unknown[]
  kbDocsLoading: boolean
  loadKBDocuments: (kbId: string) => Promise<void>
  addDocumentToKB: (kbId: string, documentId: string, opts?: { subDirection?: string; tags?: string; fitScore?: number; recommendedAction?: string }) => Promise<void>
  removeDocumentFromKB: (kbId: string, documentId: string) => Promise<void>
  reindexDocument: (kbId: string, documentId: string) => Promise<void>

  // README suggestions
  readmeSuggestions: unknown[]
  loadReadmeSuggestions: (kbId: string) => Promise<void>
  acceptSuggestion: (suggestionId: string) => Promise<void>
  rejectSuggestion: (suggestionId: string) => Promise<void>

  // Legacy flat document list
  documents: unknown[]
  loading: boolean
  loadDocuments: () => Promise<void>
  deleteDocument: (id: string) => Promise<void>
}

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  // KB list
  knowledgeBases: [],
  kbLoading: false,
  loadKnowledgeBases: async () => {
    set({ kbLoading: true })
    try {
      const kbs = await api.get<KnowledgeBase[]>('/api/knowledge-bases')
      set({ knowledgeBases: kbs, kbLoading: false })
    } catch {
      set({ kbLoading: false })
    }
  },
  createKnowledgeBase: async (name, description, readme) => {
    const kb = await api.post<KnowledgeBase>('/api/knowledge-bases', { name, description, readme })
    set(state => ({ knowledgeBases: [kb, ...state.knowledgeBases] }))
    return kb
  },
  updateKnowledgeBase: async (id, updates) => {
    await api.patch(`/api/knowledge-bases/${id}`, updates)
    set(state => ({
      knowledgeBases: state.knowledgeBases.map(kb =>
        kb.id === id ? { ...kb, ...updates } : kb
      ),
    }))
  },
  deleteKnowledgeBase: async (id) => {
    await api.delete(`/api/knowledge-bases/${id}`)
    set(state => ({
      knowledgeBases: state.knowledgeBases.filter(kb => kb.id !== id),
      selectedKBId: state.selectedKBId === id ? null : state.selectedKBId,
    }))
  },

  // Selected KB
  selectedKBId: null,
  selectKB: (id) => set({ selectedKBId: id, kbDocuments: [], readmeSuggestions: [] }),

  // Documents in selected KB
  kbDocuments: [],
  kbDocsLoading: false,
  loadKBDocuments: async (kbId) => {
    set({ kbDocsLoading: true })
    try {
      const docs = await api.get(`/api/knowledge-bases/${kbId}/documents`)
      set({ kbDocuments: docs as unknown[], kbDocsLoading: false })
    } catch {
      set({ kbDocsLoading: false })
    }
  },
  addDocumentToKB: async (kbId, documentId, opts) => {
    await api.post(`/api/knowledge-bases/${kbId}/documents`, { documentId, ...opts })
    get().loadKBDocuments(kbId)
    set(state => ({
      knowledgeBases: state.knowledgeBases.map(kb =>
        kb.id === kbId ? { ...kb, documentCount: (kb.documentCount ?? 0) + 1 } : kb
      ),
    }))
  },
  removeDocumentFromKB: async (kbId, documentId) => {
    await api.delete(`/api/knowledge-bases/${kbId}/documents/${documentId}`)
    set(state => ({
      kbDocuments: (state.kbDocuments as { id: string }[]).filter(d => d.id !== documentId),
      knowledgeBases: state.knowledgeBases.map(kb =>
        kb.id === kbId ? { ...kb, documentCount: Math.max(0, (kb.documentCount ?? 1) - 1) } : kb
      ),
    }))
  },
  reindexDocument: async (kbId, documentId) => {
    await api.post(`/api/knowledge-bases/${kbId}/documents/${documentId}/reindex`)
    get().loadKBDocuments(kbId)
  },

  // README suggestions
  readmeSuggestions: [],
  loadReadmeSuggestions: async (kbId) => {
    const suggestions = await api.get(`/api/knowledge-bases/${kbId}/readme-suggestions?status=pending`)
    set({ readmeSuggestions: suggestions as unknown[] })
  },
  acceptSuggestion: async (suggestionId) => {
    await api.post(`/api/knowledge-bases/readme-suggestions/${suggestionId}/accept`)
    set(state => ({
      readmeSuggestions: (state.readmeSuggestions as { id: string }[]).filter(s => s.id !== suggestionId),
    }))
    // Reload KB to reflect updated README
    const kbId = get().selectedKBId
    if (kbId) {
      const kb = await api.get<KnowledgeBase>(`/api/knowledge-bases/${kbId}`)
      set(state => ({
        knowledgeBases: state.knowledgeBases.map(k => k.id === kbId ? { ...k, ...kb } : k),
      }))
    }
  },
  rejectSuggestion: async (suggestionId) => {
    await api.post(`/api/knowledge-bases/readme-suggestions/${suggestionId}/reject`)
    set(state => ({
      readmeSuggestions: (state.readmeSuggestions as { id: string }[]).filter(s => s.id !== suggestionId),
    }))
  },

  // Legacy
  documents: [],
  loading: false,
  loadDocuments: async () => {
    set({ loading: true })
    const docs = await api.get('/api/knowledge')
    set({ documents: docs as unknown[], loading: false })
  },
  deleteDocument: async (id) => {
    await api.delete(`/api/knowledge/${id}`)
    set(state => ({ documents: (state.documents as { id: string }[]).filter(d => d.id !== id) }))
  },
}))
