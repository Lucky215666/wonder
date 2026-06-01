import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useDiscoveryStore } from '../discovery'
import type { DiscoveryContext, DiscoveryCandidate } from '../../types/discovery'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
vi.stubGlobal('localStorage', localStorageMock)

const mockCandidate: DiscoveryCandidate = {
  paperId: 'test-123',
  title: 'Test Paper',
  abstract: 'Test abstract',
  year: 2024,
  citationCount: 100,
  authors: [{ authorId: 'a1', name: 'Author 1' }],
  sourceQuery: 'test query',
  discoveryPriorityScore: 75,
  discoveryReason: '标题匹配: test',
  state: 'new',
}

const mockContext: DiscoveryContext = {
  mode: 'manual',
  name: 'Test Topic',
  keywords: ['test', 'topic'],
}

describe('useDiscoveryStore', () => {
  beforeEach(() => {
    const store = useDiscoveryStore.getState()
    store.clearCandidateQueue()
    store.clearDiscoveryContext()
    localStorage.clear()
  })

  it('should set discovery context', () => {
    const { setDiscoveryContext } = useDiscoveryStore.getState()

    setDiscoveryContext(mockContext)

    const { discoveryContext } = useDiscoveryStore.getState()
    expect(discoveryContext).toEqual(mockContext)
  })

  it('should clear discovery context', () => {
    const { setDiscoveryContext, clearDiscoveryContext } = useDiscoveryStore.getState()

    setDiscoveryContext(mockContext)
    clearDiscoveryContext()

    const { discoveryContext } = useDiscoveryStore.getState()
    expect(discoveryContext).toBeNull()
  })

  it('should add candidate to queue', () => {
    const { addToCandidateQueue } = useDiscoveryStore.getState()

    addToCandidateQueue(mockCandidate)

    const { candidateQueue } = useDiscoveryStore.getState()
    expect(candidateQueue).toHaveLength(1)
    expect(candidateQueue[0].paperId).toBe('test-123')
  })

  it('should not add duplicate candidate', () => {
    const { addToCandidateQueue } = useDiscoveryStore.getState()

    addToCandidateQueue(mockCandidate)
    addToCandidateQueue(mockCandidate)

    const { candidateQueue } = useDiscoveryStore.getState()
    expect(candidateQueue).toHaveLength(1)
  })

  it('should update candidate state', () => {
    const { addToCandidateQueue, updateCandidateState } = useDiscoveryStore.getState()

    addToCandidateQueue(mockCandidate)
    updateCandidateState('test-123', 'saved')

    const { candidateQueue } = useDiscoveryStore.getState()
    expect(candidateQueue[0].state).toBe('saved')
  })

  it('should remove candidate', () => {
    const { addToCandidateQueue, removeCandidate } = useDiscoveryStore.getState()

    addToCandidateQueue(mockCandidate)
    removeCandidate('test-123')

    const { candidateQueue } = useDiscoveryStore.getState()
    expect(candidateQueue).toHaveLength(0)
  })

  it('should clear candidate queue', () => {
    const { addToCandidateQueue, clearCandidateQueue } = useDiscoveryStore.getState()

    addToCandidateQueue(mockCandidate)
    clearCandidateQueue()

    const { candidateQueue } = useDiscoveryStore.getState()
    expect(candidateQueue).toHaveLength(0)
  })

  it('should check if candidate is in queue', () => {
    const { addToCandidateQueue, isInQueue } = useDiscoveryStore.getState()

    addToCandidateQueue(mockCandidate)

    expect(isInQueue('test-123')).toBe(true)
    expect(isInQueue('non-existent')).toBe(false)
  })

  it('should get candidate by paperId', () => {
    const { addToCandidateQueue, getCandidate } = useDiscoveryStore.getState()

    addToCandidateQueue(mockCandidate)

    const candidate = getCandidate('test-123')
    expect(candidate).toEqual(mockCandidate)

    const nonExistent = getCandidate('non-existent')
    expect(nonExistent).toBeUndefined()
  })

  it('should persist candidates to localStorage', () => {
    const { addToCandidateQueue } = useDiscoveryStore.getState()

    addToCandidateQueue(mockCandidate)

    const stored = localStorage.getItem('wonder-discovery-candidates')
    expect(stored).toBeTruthy()

    const parsed = JSON.parse(stored!)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].paperId).toBe('test-123')
  })

  it('should handle empty localStorage gracefully', () => {
    localStorage.clear()
    const { candidateQueue } = useDiscoveryStore.getState()

    expect(candidateQueue).toEqual([])
  })
})
