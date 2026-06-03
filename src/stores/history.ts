import { create } from 'zustand'
import { api } from '../services/api'

interface HistoryState {
  items: unknown[]
  loading: boolean
  error: string | null
  saving: boolean
  loadHistory: () => Promise<void>
  deleteHistory: (id: string) => Promise<void>
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  saving: false,
  loadHistory: async () => {
    set({ loading: true, error: null })
    try {
      const items = await api.get('/api/history')
      set({ items: items as unknown[] })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      set({ items: [], error: msg })
    } finally {
      set({ loading: false })
    }
  },
  deleteHistory: async (id: string) => {
    if (get().saving) return
    set({ saving: true })
    try {
      await api.delete(`/api/history/${id}`)
      set(state => ({
        saving: false,
        items: state.items.filter((item: any) => item.id !== id),
      }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      set({ saving: false, error: msg })
      throw err
    }
  },
}))
