import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createQueue } from '../../src/lib/batch/queue'

// ── Queue concurrency bounds ────────────────────────────────────────────────

describe('stress: queue concurrency', () => {
  it('never exceeds configured concurrency', async () => {
    const maxConcurrency = 3
    const queue = createQueue(maxConcurrency)
    let active = 0
    let peakActive = 0
    const totalTasks = 20

    const trackConcurrency = async () => {
      active++
      peakActive = Math.max(peakActive, active)
      // Simulate async work with small random delay
      await new Promise(r => setTimeout(r, Math.random() * 10))
      active--
    }

    const tasks = Array.from({ length: totalTasks }, () => queue.run(trackConcurrency))
    await Promise.all(tasks)

    expect(peakActive).toBeLessThanOrEqual(maxConcurrency)
    expect(active).toBe(0)
  })

  it('completes all tasks under burst load', async () => {
    const queue = createQueue(2)
    let completed = 0
    const totalTasks = 50

    const tasks = Array.from({ length: totalTasks }, () =>
      queue.run(async () => {
        await new Promise(r => setTimeout(r, 1))
        completed++
      }),
    )
    await Promise.all(tasks)

    expect(completed).toBe(totalTasks)
  })

  it('handles tasks that reject without breaking the queue', async () => {
    const queue = createQueue(2)
    let completed = 0
    const errors: string[] = []

    const tasks = Array.from({ length: 10 }, (_, i) =>
      queue.run(async () => {
        if (i % 3 === 0) {
          throw new Error(`task-${i}-failed`)
        }
        await new Promise(r => setTimeout(r, 1))
        completed++
      }).catch(e => errors.push(e.message)),
    )
    await Promise.all(tasks)

    // Queue should still process all tasks
    expect(completed + errors.length).toBe(10)
    expect(errors.length).toBeGreaterThan(0)
    // Subsequent tasks after failures should still complete
    expect(completed).toBeGreaterThan(0)
  })
})

// ── Knowledge store stress ──────────────────────────────────────────────────

// Mock the api module
vi.mock('../../src/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from '../../src/services/api'
import { useKnowledgeStore } from '../../src/stores/knowledge'

const mockApi = vi.mocked(api)

describe('stress: knowledge store repeated operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    useKnowledgeStore.setState({
      knowledgeBases: [],
      kbLoading: false,
      error: null,
      selectedKBId: null,
      kbDocuments: [],
      kbDocsLoading: false,
      documents: [],
      loading: false,
    })
  })

  it('repeated loadKnowledgeBases does not leave kbLoading stuck', async () => {
    const iterations = 10

    // Alternate success and failure
    mockApi.get
      .mockResolvedValueOnce([{ id: 'kb-1', name: 'KB 1' }])
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([{ id: 'kb-2', name: 'KB 2' }])
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce([{ id: 'kb-3', name: 'KB 3' }])
      .mockRejectedValueOnce(new Error('500'))
      .mockResolvedValueOnce([{ id: 'kb-4', name: 'KB 4' }])
      .mockRejectedValueOnce(new Error('503'))
      .mockResolvedValueOnce([{ id: 'kb-5', name: 'KB 5' }])
      .mockRejectedValueOnce(new Error('abort'))

    for (let i = 0; i < iterations; i++) {
      // Reset kbLoaded so each call actually hits the API
      useKnowledgeStore.setState({ kbLoaded: false })
      await useKnowledgeStore.getState().loadKnowledgeBases()
    }

    const finalState = useKnowledgeStore.getState()
    expect(finalState.kbLoading).toBe(false)
    expect(finalState.error).toBeTruthy() // last call was a rejection
  })

  it('repeated deleteKnowledgeBase calls succeed without stuck state', async () => {
    // Set up initial state with many KBs
    const kbs = Array.from({ length: 20 }, (_, i) => ({
      id: `kb-${i}`,
      name: `KB ${i}`,
      description: null,
      readme: '',
      created_at: '',
      updated_at: '',
    }))
    useKnowledgeStore.setState({ knowledgeBases: kbs })
    mockApi.delete.mockResolvedValue(undefined)

    // Delete all in sequence
    for (let i = 0; i < 20; i++) {
      await useKnowledgeStore.getState().deleteKnowledgeBase(`kb-${i}`)
    }

    const finalState = useKnowledgeStore.getState()
    expect(finalState.knowledgeBases).toHaveLength(0)
    expect(finalState.kbLoading).toBe(false)
  })

  it('repeated failed deletes do not corrupt store', async () => {
    const kbs = Array.from({ length: 5 }, (_, i) => ({
      id: `kb-${i}`,
      name: `KB ${i}`,
      description: null,
      readme: '',
      created_at: '',
      updated_at: '',
    }))
    useKnowledgeStore.setState({ knowledgeBases: kbs })
    mockApi.delete.mockRejectedValue(new Error('delete failed'))

    const errors: Error[] = []
    for (let i = 0; i < 5; i++) {
      try {
        await useKnowledgeStore.getState().deleteKnowledgeBase(`kb-${i}`)
      } catch (e) {
        errors.push(e as Error)
      }
    }

    // All deletes threw, but store should still be usable
    expect(errors.length).toBe(5)
    // KBs that weren't removed from store due to error still exist
    // (deleteKnowledgeBase calls api.delete which throws before set())
    const finalState = useKnowledgeStore.getState()
    expect(finalState.kbLoading).toBe(false)
  })
})

// ── Batch store stress ──────────────────────────────────────────────────────

import { useBatchStore } from '../../src/stores/batch'

describe('stress: batch store repeated operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useBatchStore.setState({
      runId: null,
      runName: '',
      items: [],
      running: false,
      concurrency: 2,
      runs: [],
      runsLoading: false,
      runsError: null,
    })
  })

  it('repeated loadRuns does not leave runsLoading stuck', async () => {
    mockApi.get
      .mockResolvedValueOnce([{ id: 'r-1', name: 'Run 1', status: 'done', created_at: '' }])
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce([{ id: 'r-2', name: 'Run 2', status: 'done', created_at: '' }])
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce([])

    for (let i = 0; i < 5; i++) {
      await useBatchStore.getState().loadRuns()
    }

    const finalState = useBatchStore.getState()
    expect(finalState.runsLoading).toBe(false)
  })

  it('reset clears all state cleanly', () => {
    useBatchStore.setState({
      runId: 'run-1',
      runName: 'Test',
      items: [{ id: 'i-1', fileName: 'a.pdf', fileType: 'pdf', status: 'pending', documentId: null, historyId: null, error: null }],
      running: true,
      runsError: 'previous error',
    })

    useBatchStore.getState().reset()

    const state = useBatchStore.getState()
    expect(state.runId).toBeNull()
    expect(state.items).toHaveLength(0)
    expect(state.running).toBe(false)
    expect(state.runsError).toBeNull()
  })

  it('cancelAll sets running to false and cancels pending items', () => {
    useBatchStore.setState({
      running: true,
      items: [
        { id: 'i-1', fileName: 'a.pdf', fileType: 'pdf', status: 'pending', documentId: null, historyId: null, error: null },
        { id: 'i-2', fileName: 'b.pdf', fileType: 'pdf', status: 'analyzing', documentId: null, historyId: null, error: null },
        { id: 'i-3', fileName: 'c.pdf', fileType: 'pdf', status: 'done', documentId: 'd-3', historyId: 'h-3', error: null },
        { id: 'i-4', fileName: 'd.pdf', fileType: 'pdf', status: 'error', documentId: null, historyId: null, error: 'fail' },
      ],
    })

    useBatchStore.getState().cancelAll()

    const state = useBatchStore.getState()
    expect(state.running).toBe(false)
    expect(state.items[0].status).toBe('cancelled')
    expect(state.items[1].status).toBe('cancelled')
    expect(state.items[2].status).toBe('done') // untouched
    expect(state.items[3].status).toBe('error') // untouched
  })
})

// ── Unhandled rejection guard ───────────────────────────────────────────────

describe('stress: repeated API failures', () => {
  it('rejected promises are caught, not unhandled', async () => {
    const store = useKnowledgeStore.getState()
    mockApi.get.mockRejectedValue(new Error('persistent failure'))

    // Fire many concurrent failing requests
    const promises = Array.from({ length: 20 }, () =>
      useKnowledgeStore.getState().loadKnowledgeBases(),
    )

    // Should not throw unhandled rejections
    await expect(Promise.all(promises)).resolves.toBeDefined()

    const state = useKnowledgeStore.getState()
    expect(state.kbLoading).toBe(false)
  })

  it('rapid create-delete cycle does not leak state', async () => {
    // Reset store to clean state for this test
    useKnowledgeStore.setState({
      knowledgeBases: [],
      kbLoading: false,
      error: null,
      selectedKBId: null,
    })
    mockApi.post.mockImplementation(async (_url: string, body: { name: string }) => ({
      id: `kb-${Date.now()}-${Math.random()}`,
      name: body.name,
      description: null,
      readme: '',
      created_at: '',
      updated_at: '',
    }))
    mockApi.delete.mockResolvedValue(undefined)

    // Rapidly create and delete
    for (let i = 0; i < 15; i++) {
      const kb = await useKnowledgeStore.getState().createKnowledgeBase(`temp-${i}`)
      await useKnowledgeStore.getState().deleteKnowledgeBase(kb.id)
    }

    const state = useKnowledgeStore.getState()
    expect(state.knowledgeBases).toHaveLength(0)
    expect(state.kbLoading).toBe(false)
    expect(state.error).toBeNull()
  })
})
