import { create } from 'zustand'
import { api } from '../services/api'

interface QASources {
  docIds: string[]
  chunks: string[]
}

interface QAMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: QASources
}

interface QAState {
  messages: QAMessage[]
  loading: boolean
  sendMessage: (question: string, knowledgeBaseId?: string) => Promise<void>
  clear: () => void
}

export const useQAStore = create<QAState>((set) => ({
  messages: [],
  loading: false,
  sendMessage: async (question, knowledgeBaseId) => {
    set((state) => ({ messages: [...state.messages, { role: 'user', content: question }], loading: true }))
    const res = await api.post<{ answer: string; sources?: QASources }>('/api/qa', { question, knowledgeBaseId })
    set((state) => ({
      messages: [...state.messages, { role: 'assistant', content: res.answer, sources: res.sources }],
      loading: false,
    }))
  },
  clear: () => set({ messages: [] }),
}))
