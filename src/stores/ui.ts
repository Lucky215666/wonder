import { create } from 'zustand'

interface UIState {
  settingsOpen: boolean
  settingsTarget: 'analysis' | 'embedding' | null
  openSettings: (target?: 'analysis' | 'embedding') => void
  closeSettings: () => void
}

export const useUIStore = create<UIState>((set) => ({
  settingsOpen: false,
  settingsTarget: null,
  openSettings: (target) => set({ settingsOpen: true, settingsTarget: target ?? null }),
  closeSettings: () => set({ settingsOpen: false, settingsTarget: null }),
}))
