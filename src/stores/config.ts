import { create } from 'zustand'
import { api } from '../services/api'
import type { AppConfig } from '../lib/llm/types'

interface ConfigState {
  config: AppConfig | null
  loaded: boolean
  loadConfig: () => Promise<void>
  saveConfig: (config: AppConfig) => Promise<void>
}

export const useConfigStore = create<ConfigState>((set) => ({
  config: null,
  loaded: false,
  loadConfig: async () => {
    const data = await api.get<Record<string, string>>('/api/config')
    const raw = data.appConfig
    if (raw) set({ config: JSON.parse(raw), loaded: true })
    else set({ loaded: true })
  },
  saveConfig: async (config) => {
    await api.put('/api/config', { appConfig: JSON.stringify(config) })
    set({ config })
  },
}))
