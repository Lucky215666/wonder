import { create } from 'zustand'
import type { DiscoveryContext, DiscoveryCandidate } from '../types/discovery'

const STORAGE_KEY = 'wonder-discovery-candidates'

function loadCandidatesFromStorage(): DiscoveryCandidate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // ignore parse errors
  }
  return []
}

function saveCandidatesToStorage(candidates: DiscoveryCandidate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates))
  } catch {
    // ignore storage errors
  }
}

interface DiscoveryState {
  discoveryContext: DiscoveryContext | null
  candidateQueue: DiscoveryCandidate[]

  setDiscoveryContext: (context: DiscoveryContext) => void
  clearDiscoveryContext: () => void
  addToCandidateQueue: (candidate: DiscoveryCandidate) => void
  updateCandidateState: (paperId: string, state: DiscoveryCandidate['state']) => void
  removeCandidate: (paperId: string) => void
  clearCandidateQueue: () => void
  isInQueue: (paperId: string) => boolean
  getCandidate: (paperId: string) => DiscoveryCandidate | undefined
}

export const useDiscoveryStore = create<DiscoveryState>((set, get) => ({
  discoveryContext: null,
  candidateQueue: loadCandidatesFromStorage(),

  setDiscoveryContext: (context) => {
    set({ discoveryContext: context })
  },

  clearDiscoveryContext: () => {
    set({ discoveryContext: null })
  },

  addToCandidateQueue: (candidate) => {
    const existing = get().candidateQueue.find(c => c.paperId === candidate.paperId)
    if (existing) {
      return
    }
    const updated = [...get().candidateQueue, candidate]
    saveCandidatesToStorage(updated)
    set({ candidateQueue: updated })
  },

  updateCandidateState: (paperId, state) => {
    const updated = get().candidateQueue.map(c =>
      c.paperId === paperId ? { ...c, state } : c
    )
    saveCandidatesToStorage(updated)
    set({ candidateQueue: updated })
  },

  removeCandidate: (paperId) => {
    const updated = get().candidateQueue.filter(c => c.paperId !== paperId)
    saveCandidatesToStorage(updated)
    set({ candidateQueue: updated })
  },

  clearCandidateQueue: () => {
    saveCandidatesToStorage([])
    set({ candidateQueue: [] })
  },

  isInQueue: (paperId) => {
    return get().candidateQueue.some(c => c.paperId === paperId)
  },

  getCandidate: (paperId) => {
    return get().candidateQueue.find(c => c.paperId === paperId)
  },
}))
