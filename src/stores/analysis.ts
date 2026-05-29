import { create } from 'zustand'
import { api } from '../services/api'

interface AnalysisStep {
  step: string
  status: 'running' | 'done' | 'error'
  label: string
  result?: unknown
}

interface AnalysisState {
  steps: AnalysisStep[]
  running: boolean
  documentId: string | null
  analyze: (fileName: string, fileType: string, text: string) => Promise<void>
  reset: () => void
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  steps: [],
  running: false,
  documentId: null,
  analyze: async (fileName, fileType, text) => {
    set({ running: true, steps: [], documentId: null })
    await api.stream('/api/analysis/single', { fileName, fileType, text }, (event, data) => {
      if (event === 'step') {
        const step = JSON.parse(data) as AnalysisStep
        set((state) => {
          const idx = state.steps.findIndex(s => s.step === step.step)
          if (idx >= 0) {
            const newSteps = [...state.steps]
            newSteps[idx] = step
            return { steps: newSteps }
          }
          return { steps: [...state.steps, step] }
        })
      } else if (event === 'complete') {
        const { documentId } = JSON.parse(data)
        set({ running: false, documentId })
      }
    })
  },
  reset: () => set({ steps: [], running: false, documentId: null }),
}))
