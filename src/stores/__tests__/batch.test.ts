import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import { useBatchStore } from '../batch'
import { api } from '../../services/api'

const mockApi = vi.mocked(api)

describe('useBatchStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useBatchStore.setState({
      runs: [],
      runsLoading: false,
      runsError: null,
    })
  })

  it('sets runsError when loadRuns fails', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('service unavailable'))

    await useBatchStore.getState().loadRuns()

    expect(useBatchStore.getState().runsLoading).toBe(false)
    expect(useBatchStore.getState().runsError).toBe('service unavailable')
  })

  it('clears runsError on successful loadRuns', async () => {
    useBatchStore.setState({ runsError: 'old error' })
    mockApi.get.mockResolvedValueOnce([])

    await useBatchStore.getState().loadRuns()

    expect(useBatchStore.getState().runsError).toBeNull()
  })
})
