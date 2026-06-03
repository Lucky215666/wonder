import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}))

import { useHistoryStore } from '../history'
import { api } from '../../services/api'

const mockApi = vi.mocked(api)

describe('useHistoryStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useHistoryStore.setState({ items: [], loading: false })
  })

  it('resets loading when loadHistory fails', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('network down'))

    await expect(useHistoryStore.getState().loadHistory()).resolves.toBeUndefined()

    expect(useHistoryStore.getState().loading).toBe(false)
    expect(useHistoryStore.getState().items).toEqual([])
  })
})
