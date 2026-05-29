import { create } from 'zustand'
import { api } from '../services/api'

interface HistoryState {
  items: unknown[]
  loading: boolean
  loadHistory: () => Promise<void>
}

export const useHistoryStore = create<HistoryState>((set) => ({
  items: [],
  loading: false,
  loadHistory: async () => {
    set({ loading: true })
    const items = await api.get('/api/history')
    set({ items: items as unknown[], loading: false })
  },
}))
