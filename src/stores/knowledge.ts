import { create } from 'zustand'
import { api } from '../services/api'

interface KnowledgeState {
  documents: unknown[]
  loading: boolean
  loadDocuments: () => Promise<void>
  deleteDocument: (id: string) => Promise<void>
}

export const useKnowledgeStore = create<KnowledgeState>((set) => ({
  documents: [],
  loading: false,
  loadDocuments: async () => {
    set({ loading: true })
    const docs = await api.get('/api/knowledge')
    set({ documents: docs as unknown[], loading: false })
  },
  deleteDocument: async (id) => {
    await api.delete(`/api/knowledge/${id}`)
    set((state) => ({ documents: (state.documents as { id: string }[]).filter(d => d.id !== id) }))
  },
}))
