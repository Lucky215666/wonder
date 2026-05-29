import { create } from 'zustand'
import { api } from '../services/api'

interface QAMessage { role: 'user' | 'assistant'; content: string }

interface QAState {
  messages: QAMessage[]
  loading: boolean
  sendMessage: (question: string) => Promise<void>
  clear: () => void
}

export const useQAStore = create<QAState>((set) => ({
  messages: [],
  loading: false,
  sendMessage: async (question) => {
    set((state) => ({ messages: [...state.messages, { role: 'user', content: question }], loading: true }))
    const res = await api.post<{ answer: string }>('/api/qa', { question })
    set((state) => ({
      messages: [...state.messages, { role: 'assistant', content: res.answer }],
      loading: false,
    }))
  },
  clear: () => set({ messages: [] }),
}))
