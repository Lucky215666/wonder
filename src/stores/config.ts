import { create } from 'zustand'
import { api } from '../services/api'
import type { AppConfig } from '../types/analysis'

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
    if (raw) {
      const parsed = JSON.parse(raw) as AppConfig
      // Also load globalUserProfile from separate config key
      if (data.globalUserProfile) {
        parsed.globalUserProfile = data.globalUserProfile
      }
      set({ config: parsed, loaded: true })
    } else {
      set({ loaded: true })
    }
  },
  saveConfig: async (config) => {
    const payload: Record<string, string> = {
      appConfig: JSON.stringify(config),
    }
    if (config.globalUserProfile) {
      payload.globalUserProfile = config.globalUserProfile
    }
    await api.put('/api/config', payload)
    set({ config })
  },
}))
